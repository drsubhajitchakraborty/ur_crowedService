const jwt = require('jsonwebtoken')
const utils = require('../middleware/utils')
const uuid = require('uuid')
const { addHours } = require('date-fns')
const { matchedData } = require('express-validator')
const auth = require('../middleware/admin.auth')
const HOURS_TO_BLOCK = 2
const LOGIN_ATTEMPTS = 5
const SALT_ROUNDS = 5
const db = require('../middleware/admin.db')
const fs = require('fs');
const emailer = require('../middleware/admin-emailer')
var _ = require('underscore');
const bcrypt = require('bcrypt')

/********************
 * Call Models *
 ********************/
const AdminSchema = require('../models/admin.model')
const ContentManagement = require('../models/content_management.model')
const UserSchema = require('../models/user')
var PromoCodeSchema = require('../models/PromoCode.model');
var EventSchema = require('../models/eventManage.model');
var RoomSchema = require('../models/roomManage.model');

var RealtorsSchema = require('../models/user');
var ServiceSchema = require('../models/services.model');


var CMS = require('../models/cms');
var FAQSchema = require('../models/faq.model');
var ContactUsSchema = require('../models/contactUs.model');
var CMSSchema = require('../models/cms');

/********************
 * Define Images Paths *
 ********************/


const AMIN_PROFILE = 'public/adminProfile'
const USER_PROFILE = 'public/userProfile'
const ROOM_IMAGE = 'public/room'




const REALTORS_PROFILE = 'public/realtorsProfile'
const BUYERS_PROFILE = 'public/buyersProfile'
const CONTRACTORS_PROFILE = 'public/contractorsProfile'
const HOMEINSPECTORS_PROFILE = 'public/homeInspectorsProfile'
const SERVICEICON_PROFILE = 'public/serviceIcon'

const CITY_IMAGE = 'public/city'
const CMS_IMAGE = 'public/CMS'
const SOCIALMEDIA_IMAGE = 'public/socialmedia'

/********************
 * Public functions *
 ********************/

const generateToken = org => {
    // Gets expiration time
    const expiration =
        Math.floor(Date.now() / 1000) + 60 * process.env.JWT_EXPIRATION_IN_MINUTES

    // returns signed and encrypted token
    return auth.encrypt(
        jwt.sign(
            {
                data: {
                    _id: org
                },
                exp: expiration
            },
            process.env.JWT_SECRET
        )
    )
}


const getUserIdFromToken = async token => {
    // console.log('token = ', token)
    return new Promise((resolve, reject) => {
        // Decrypts, verifies and decode token
        jwt.verify(auth.decrypt(token), process.env.JWT_SECRET, (err, decoded) => {
            // console.log('decodeeed *******', decoded);
            if (err) {
                console.log(err);
                reject(utils.buildErrObject(409, 'BAD_TOKEN'))
            }
            resolve(decoded.data._id)
        })
    })
}
/**
 * Blocks a user by setting blockExpires to the specified date based on constant HOURS_TO_BLOCK
 * @param {Object} user - user object
 */
const blockUser = async user => {
  return new Promise((resolve, reject) => {
    user.blockExpires = addHours(new Date(), HOURS_TO_BLOCK)
    user.save((err, result) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      if (result) {
        resolve(utils.buildErrObject(409, 'BLOCKED_USER'))
      }
    })
  })
}
const findAdmin = async email => {
    return new Promise((resolve, reject) => {
        AdminSchema.findOne(
            {
                email
            },
            'name  password loginAttempts password blockExpires  email profile_image role verified verification phone permission reset_pass_verified',
            (err, item) => {
                utils.itemNotFound(err, item, reject, 'ADMIN_DOES_NOT_EXIST')
                resolve(item)
            }
        )
    })
}

const findAdminByToken = async id => {
    return new Promise((resolve, reject) => {
      AdminSchema.findById(
            {
                _id: id
            },
            'name  loginAttempts blockExpires password email profile_image role verified verification phone permission reset_pass_verified',
            (err, item) => {
                utils.itemNotFound(err, item, reject, 'ADMIN_DOES_NOT_EXIST')
                resolve(item)
            }
        )
    })
}



const passwordsDoNotMatch = async user => {
    user.loginAttempts += 1
    //await saveLoginAttemptsToDB(user)
    return new Promise((resolve, reject) => {
        if (user.loginAttempts <= LOGIN_ATTEMPTS) {
            resolve(utils.buildErrObject(409, 'WRONG_PASSWORD'))
        } else {
            resolve(blockUser(user))
        }
        reject(utils.buildErrObject(422, 'ERROR'))
    })
}


const returnAdminToken = async (req) => {
    return new Promise((resolve, reject) => {
        // const userInfo = setUserInfo(user)
        // Returns data with access token
        resolve({
            token: generateToken(req._id),
            data: req,
            response: 200
        })
    })
}

const updatePassword = async (password, user) => {
    return new Promise((resolve, reject) => {
        user.password = password;
        user.dec_password = password;
        // user.reset_pass_verified = true;
        user.save((err, item) => {
            utils.itemNotFound(err, item, reject, 'NOT_FOUND')
            resolve({ data: item, code: 200, status: true })
        })
    })
}


/********************
 * Exports functions *
 ********************/

exports.AdminLogin = async (req, res) => {
    try {
        const data = matchedData(req)
        console.log('data=============', data);

        const admin = await db.getItemByEmail(data.email, AdminSchema)
        console.log('Org found', admin);
        //await userIsBlocked(user)
        // await orgIsVerified(org)
        // await checkLoginAttemptsAndBlockExpires(user)
        const isPasswordMatch = await auth.checkPassword(data.password, admin)
        if (!isPasswordMatch) {
            utils.handleError(res, await passwordsDoNotMatch(admin))
        } else {
            // all ok, register access and return token
            admin.loginAttempts = 0
            //await saveLoginAttemptsToDB(org)
            delete admin.password
            res.status(200).json(await returnAdminToken(admin))
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.createAdminUser = async (req, res) => {
    try {

        // Gets locale from header 'Accept-Language'
        const locale = req.getLocale()
        // req = matchedData(req)
        body = req.body
        // console.log('dataaa===', req);
        const doesOrgExists = await emailer.adminExists(body.email, AdminSchema)
        if (!doesOrgExists) {
            console.log('here is the data', body);
            const item = await db.createItem(body, AdminSchema)
            const response = await returnAdminToken(item)
            res.status(201).json(response)
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.AdminDetails = async (req, res) => {
    try {
        // console.log('-----------',req.headers)
        const data = matchedData(req)
        // console.log(data);
        const token = req.headers.authorization.replace('Bearer ', '').trim()
        let adminId = await getUserIdFromToken(token)
        const admin = await findAdminByToken(adminId)
        // console.log('Org found', admin);
        delete admin.password
        res.status(200).json({
            code: 200,
            data: admin
        })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.editAdminDetails = async (req, res) => {
    try {
        console.log('===============,req.files',req.files)
        const data = matchedData(req)
        // console.log(data);
        const token = req.headers.authorization.replace('Bearer ', '').trim()
        let adminId = await getUserIdFromToken(token)
        adminId = await utils.isIDGood(adminId)
        if(req.body.image){
            var userData =  await findAdminByToken(adminId)
            if(userData.profile_image!=null && userData.profile_image!=''){
                var unfluck = await db.fileUnlinkFormServer(AMIN_PROFILE + '/'+userData.profile_image)
            }
            var image_name = await db.base64ImageUpload({
                image_data: req.body.image,
                path: AMIN_PROFILE
            })
            delete req.body.image
            req.body.profile_image = image_name;
        }
        if(req.files && req.files.profile_image){
            var userData =  await findAdminByToken(adminId)
            if(userData.profile_image!=null && userData.profile_image!=''){
                var unfluck = await db.fileUnlinkFormServer(AMIN_PROFILE + '/'+userData.profile_image)
            }
            var image_name = await db.uploadImage({
                image_data: req.files.profile_image,
                path: AMIN_PROFILE
            })
            req.body.profile_image = image_name;
        }
        console.log('req.body================', req.body);
        const update = await db.updateItem(adminId,AdminSchema,req.body)
        const admin = await findAdminByToken(adminId)
        // console.log('data found', admin);
        res.status(200).json({
            code: 200,
            data: admin
        })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.changePassword = async (req, res) => {
    try {
        // console.log(req.body);
        // console.log('req.headers.token',req.headers.token);
        const data = matchedData(req)
        const token = req.headers.authorization.replace('Bearer ', '').trim()
        let userId = await getUserIdFromToken(token)
        console.log('here: ', userId);
        const admin = await findAdminByToken(userId)
        const isPasswordMatch = await auth.checkPassword(data.oldpassword, admin);
        if (!isPasswordMatch) {
            res.status(404).json({ code: 404, message: 'Incorrect old password' })
        } else {
            admin.password = data.password
            admin.save(async (err, item) => {
            if (err) res.status(500).json({ code: 500, message: 'Something went wrong' });
                var admin = await findAdminByToken(userId)
                res.status(200).json({ code: 200, message: 'Password updated successfully',data:admin })
            })
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.forgotPassword = async (req, res) => {
    try {
        // Gets locale from header 'Accept-Language'
        const locale = req.getLocale()
        const data = req.body
        console.log(data);
        var admin = await findAdmin(data.email)
        const token = generateToken(admin._id)
        admin.reset_pass_verified = false;
        admin.save((err, item) => {
            if (err) res.status(500).json({ code: 500, message: 'something went wrong' });
                var item = {
                    admin:admin,
                    token:token,
                    template_name: 'admin_forgot_password'
                };
                emailer.sendForgotEmailAdmin(item)
                res.status(200).json({ code: 200, message:'Reset link send to your mail' });
        })
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.resetPassword = async (req, res) => {
    try {
        const data = req.body
        let userId = await getUserIdFromToken(req.body.token)
        const admin = await findAdminByToken(userId)
        console.log('----',admin.reset_pass_verified)
        if (admin.reset_pass_verified==false) {
            const updateData = await updatePassword(req.body.password, admin)
            res.status(200).json({
                code: 200,
                message: 'Password reset successfully'
            })
        }else{
            res.status(400).json({
                code: 400,
                message: 'Reset password link expire'
            })
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}



///////////////////////////////////////
exports.addCategory = async (req, res) => {
  try {
    var data = req.body;
    console.log('create Content===============', data)
    const dataCheck = await db.checkItem(data, CategorySchema);
    // console.log('daat check=======', dataCheck);
    if(!dataCheck){
    const obj = await db.createItem(data, CategorySchema);
    res.status(201).json({
      code: 201,
      response_data:obj
    })
  }else{
    res.status(409).json({
      code: 409,
      message:'Data already Exits!!!'
    })
  }
  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}


exports.getCategoryList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCategoryItemPagination(req.body, CategorySchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.getActiveCategoryList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await CategorySchema.find({isActive: true})
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editCategory = async (req, res) => {
  try {
      const data = req.body
      console.log(data);
      let categoryId = data.category_id;

      const update = await db.updateItem(categoryId,CategorySchema,data)

      res.status(200).json({
          code: 200,
          response_data: update
      })
  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.deleteCategory = async (req,res) =>{
  try{
      var categoryDelete = await db.deleteItem(req.body.category_id, CategorySchema)
      res.status(200).json({
          code: 200,
          message :"Category Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleCategory = async (req,res) =>{
  try{
      var categoryDeletes = await db.deleteItems(req.body.category_id_arr, CategorySchema)
      res.status(200).json({
          code: 200,
          message :"Categories Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.createContent = async (req, res) => {
  try {
    var data = req.body;
    console.log('saveContent===============', data)
    const obj = await db.createItem(data, ContentManagement);
    res.status(200).json({
      code: 200,
      response_data:obj
    })
  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}
exports.saveContent = async (req, res) => {
  try {
    var data = req.body;
    console.log('saveContent===============', data)
    await db.saveContent({
      ContentManagement: ContentManagement
    }, data)
    res.status(200).json({
      code: 200
    })
  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}

exports.getAllContentData = async (req, res) => {
  try {
    const query = await db.checkQueryString(req.query)
    res.status(200).json(await db.getItems(req, ContentManagement, query))
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.addFAQ = async (req, res) => {
  try {
    var data = req.body;
    console.log('create Content===============', data)
    const obj = await db.createItem(data, FAQSchema);
    res.status(200).json({
      code: 200,
      response_data:obj
    })
  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}


exports.getFAQList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCategoryItemPagination(req.body, FAQSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editFAQ = async (req, res) => {
  try {
      const data = req.body
      console.log(data);
      let faqId = data.faq_id;

      const update = await db.updateItem(faqId,FAQSchema,data)

      res.status(200).json({
          code: 200,
          response_data: update
      })
  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.deleteFAQ = async (req,res) =>{
  try{
      var faqDelete = await db.deleteItem(req.body.faq_id, FAQSchema)
      res.status(200).json({
          code: 200,
          message :"FAQ Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleFAQ = async (req,res) =>{
  try{
      var faqDeletes = await db.deleteItems(req.body.faq_id_arr, FAQSchema)
      res.status(200).json({
          code: 200,
          message :"FAQ's Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.addContactUs = async (req, res) => {
  try {
    var data = req.body;
    console.log('create Content===============', data)
    const obj = await db.createItem(data, ContactUsSchema);
    res.status(200).json({
      code: 200,
      response_data:obj
    })
  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}


exports.getContactUsList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCategoryItemPagination(req.body, ContactUsSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.deleteContactUs = async (req,res) =>{
  try{
      var contactUsDelete = await db.deleteItem(req.body.contactUs_id, ContactUsSchema)
      res.status(200).json({
          code: 200,
          message :"Contact Us Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleContactUs = async (req,res) =>{
  try{
      var conatctUsDeletes = await db.deleteItems(req.body.conatctUs_id_arr, ContactUsSchema)
      res.status(200).json({
          code: 200,
          message :"Contact Us Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}
exports.replyOnContactUs = async (req, res) => {
  try {
      const data = req.body
      console.log(data);
      var response_data = await ContactUsSchema.findOne({_id: data._id})
      response_data.isActive = false;
      response_data.replyMessage = data.replyMessage
      response_data.save((err, item) => {
          if (err) res.status(500).json({ code: 500, message: 'something went wrong' });
          console.log('err====================', err)
              var item1 = {
                data:data,
                template_name: 'contactUs_email'
              };
              emailer.sendContactUsEmailToUser(item1)
              res.status(200).json({ code: 200, message:'Email send successfully' });
      })
  } catch (error) {
    console.log('error=========================', error)
      utils.handleError(res, error)
  }
}





exports.addPromoCode = async (req, res) => {
  try {
    var data = req.body;
    console.log('create Content===============', data)
    const obj = await db.createItem(data, PromoCodeSchema);
    res.status(201).json({
      code: 201,
      response_data:obj
    })
  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}


exports.getPromoCodeList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getPromoCodeItemPagination(req.body, PromoCodeSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editPromoCode = async (req, res) => {
  try {
      const data = req.body
      console.log(data);
      let promoId = data.promo_id;

      const update = await db.updateItem(promoId,PromoCodeSchema,data)

      res.status(200).json({
          code: 200,
          response_data: update
      })
  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.deletePromoCode = async (req,res) =>{
  try{
      var promoDelete = await db.deleteItem(req.body.promo_id, PromoCodeSchema)
      res.status(200).json({
          code: 200,
          message :"promo Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultiplePromoCode = async (req,res) =>{
  try{
      var promoDeletes = await db.deleteItems(req.body.promo_id_arr, PromoCodeSchema)
      res.status(200).json({
          code: 200,
          message :"promo's Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.GetDashboardCardData = async (req,res) =>{
  try{
    var totalRestaurantData = await RestaurantSchema.countDocuments()
    var activeTotalRestaurantData = await RestaurantSchema.countDocuments({isActive : true})
    var totalMenuData = await MenusSchema.countDocuments()
    var activeTotalMenuData = await MenusSchema.countDocuments({isActive : true})
    res.status(200).json({
      code: 200,
      response_data : {
        totalRestaurantData:totalRestaurantData,
        activeTotalRestaurantData:activeTotalRestaurantData,
        totalMenuData:totalMenuData,
        activeTotalMenuData:activeTotalMenuData,
      }
  });

  }catch(error){
      utils.handleError(res, error)
  }
}



exports.addState = async (req, res) => {
  try {
    let data = req.body
    var obj = {
      name : data.name,
    }
    const dataCheck = await db.checkItem(obj, StateSchema);
    if(!dataCheck){
    const object = await db.createItem(req.body, StateSchema);
    res.status(201).json({
      code: 201,
      response_data:object
    })
  }else{
    res.status(409).json({
      code: 409,
      message:'State name already Exits!!!'
    })
  }


  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}


exports.getStateList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCategoryItemPagination(req.body, StateSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editState = async (req, res) => {
  try {
    let data = req.body
    var obj = {
      name : data.name
    }
    const dataCheck = await db.checkItem(obj, StateSchema);
    if(!dataCheck){

      let stateId = data.state_id;

      const update = await db.updateItem(stateId,StateSchema,data)
    res.status(200).json({
      code: 200,
      response_data:update
    })
  }else{
    res.status(409).json({
      code: 409,
      message:'State name already Exits!!!'
    })
  }


  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.deleteState = async (req,res) =>{
  try{
      var stateDelete = await db.deleteItem(req.body.state_id, StateSchema)
      res.status(200).json({
          code: 200,
          message :"state Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleState = async (req,res) =>{
  try{
      var stateDeletes = await db.deleteItems(req.body.state_id_arr, StateSchema)
      res.status(200).json({
          code: 200,
          message :"State's Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.addCity = async (req, res) => {
  try {
    let data = req.body
    var obj = {
      name : data.name,
      state_id : data.state_id
    }
    const dataCheck = await db.checkItem(obj, CitySchema);
    if(!dataCheck){
      console.log('create Content===============', data)
      if(req.files && req.files.image){
        var image_name = await db.uploadImage({
            image_data: req.files.image,
            path: CITY_IMAGE
        })
        req.body.image = image_name;
    }
      const obj = await db.createItem(data, CitySchema);
      res.status(201).json({
        code: 201,
        response_data:obj
      })
  }else{
    res.status(409).json({
      code: 409,
      message:'City name already Exits!!!'
    })
  }


  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}


exports.getCityList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCityItemPagination(req.body, CitySchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editCity = async (req, res) => {
  try {

    let data = req.body
    var obj = {
      name : data.name,
      state_id : data.state_id
    }
    const dataCheck = await db.checkItem(obj, CitySchema);
    if(!dataCheck){
      console.log(data);
      let cityId = req.body.city_id;
      var cityData =  await db.getItem(cityId, CitySchema)
      if(cityData){
      if(req.files && req.files.image){
          if(cityData.image!=null && cityData.image!=''){
              var unfluck = await db.fileUnlinkFormServer(CITY_IMAGE + '/'+cityData.image)
          }

          var image_name = await db.uploadImage({
              image_data: req.files.image,
              path: CITY_IMAGE
          })
          req.body.image = image_name;
      }
      const update = await db.updateItem(cityId,CitySchema,data)

      res.status(200).json({
          code: 200,
          response_data: update
      })
    } else {
      res.status(404).json({
        code: 404,
        message: 'City Not Found'
    })
    }
  }else{
    res.status(409).json({
      code: 409,
      message:'Data already Exits!!!'
    })
  }




  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.deleteCity = async (req,res) =>{
  try{
    var cityData =  await db.getItem(req.body.city_id, CitySchema)
    if(cityData.image!=null && cityData.image!=''){
      var unfluck = await db.fileUnlinkFormServer(CITY_IMAGE + '/'+cityData.image)
  }

      var cityDelete = await db.deleteItem(req.body.city_id, CitySchema)
      res.status(200).json({
          code: 200,
          message :"City Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleCity = async (req,res) =>{
  try{
    var cityDeletesData = await CitySchema.find({
      _id: {
        $in: req.body.city_id_arr
      }
    })
    _.map(cityDeletesData,async(files)=>{
      if(cityDeletesData.image!=null && cityDeletesData.image!=''){
        var unfluck = await db.fileUnlinkFormServer(CITY_IMAGE + '/'+cityDeletesData.image)
    }
  });

      var cityDeletes = await db.deleteItems(req.body.city_id_arr, CitySchema)
      res.status(200).json({
          code: 200,
          message :"City's Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.getActiveState = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await  StateSchema.find({isActive: true})
      // var send = await  StateSchema.find({isActive: true}).populate('city')
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.getActiveCity = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await CitySchema.find({isActive: true})
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.addCMS = async (req,res) =>{
  try{
    let data = req.body
    var obj = {
      page_name : data.page_name,
      page_heading : data.page_heading
    }
    const dataCheck = await db.checkItem(obj, CMSSchema);
    if(!dataCheck){
      // menu image upload from data
      if(req.files && req.files.image){
        var image_name = await db.uploadImage({
            image_data: req.files.image,
            path: CMS_IMAGE
        })
        req.body.image = image_name;
    }
    const object = await db.createItem(req.body, CMSSchema);
    res.status(201).json({
      code: 201,
      response_data:object
    })
  }else{
    res.status(409).json({
      code: 409,
      message:'Data already Exits!!!'
    })
  }




  }catch(error){
      utils.handleError(res, error)
  }
}


exports.getCMSList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCategoryItemPagination(req.body, CMSSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editCMS = async (req, res) => {
  try {
    let data = req.body

      // cms image upload from data
      if(req.files && req.files.image){
        var cmsData = await db.getItem(data.cms_id, CMSSchema)
        if(cmsData.image!=null && cmsData.image!=''){
            var unfluck = await db.fileUnlinkFormServer(CMS_IMAGE + '/'+cmsData.image)
        }

        var image_name = await db.uploadImage({
            image_data: req.files.image,
            path: CMS_IMAGE
        })
        req.body.image = image_name;
    }
    const object = await db.updateItem(data.cms_id,CMSSchema,req.body)
    res.status(200).json({
      code: 200,
      response_data:object
    })


  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.deleteCMS = async (req,res) =>{
  try{
      var cmsData = await db.getItem(req.body.cms_id, CMSSchema)
      if(cmsData.image!=null && cmsData.image!=''){
          var unfluck = await db.fileUnlinkFormServer(CMS_IMAGE + '/'+cmsData.image)
      }
      var cmsDelete = await db.deleteItem(req.body.cms_id, CMSSchema)
      res.status(200).json({
          code: 200,
          message :"CMS Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.getStateCity = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await CitySchema.find({isActive: true,state_id: req.body.state_id})
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.addSubscription = async (req,res) =>{
  try{
    let data = req.body
    var obj = {
      duration : data.duration,
    }
    const dataCheck = await db.checkItem(obj, SubscriptionSchema);
    if(!dataCheck){

    const object = await db.createItem(req.body, SubscriptionSchema);
    res.status(201).json({
      code: 201,
      response_data:object
    })
  }else{
    res.status(409).json({
      code: 409,
      message:'Data already Exits!!!'
    })
  }




  }catch(error){
      utils.handleError(res, error)
  }
}


exports.getSubscriptionList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCategoryItemPagination(req.body, SubscriptionSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editSubscription = async (req, res) => {
  try {
    let data = req.body


    const object = await db.updateItem(data.subs_id,SubscriptionSchema,req.body)
    res.status(200).json({
      code: 200,
      response_data:object
    })


  } catch (error) {
      utils.handleError(res, error)
  }
}

exports.deleteSubscription = async (req,res) =>{
  try{

      var dataDelete = await db.deleteItem(req.body.subs_id, SubscriptionSchema)
      res.status(200).json({
          code: 200,
          message :"Data Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.addSocialMedia = async (req, res) => {
  try {
    let data = req.body
    var obj = {
      name : data.name
    }
    const dataCheck = await db.checkItem(obj, SocialMediaSchema);
    if(!dataCheck){
      console.log('create Content===============', data)
      if(req.files && req.files.image){
        var image_name = await db.uploadImage({
            image_data: req.files.image,
            path: SOCIALMEDIA_IMAGE
        })
        req.body.image = image_name;
    }
      const obj = await db.createItem(data, SocialMediaSchema);
      res.status(201).json({
        code: 201,
        response_data:obj
      })
  }else{
    res.status(409).json({
      code: 409,
      message:'This name already Exits!!!'
    })
  }


  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}


exports.getSocialMediaList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCityItemPagination(req.body, SocialMediaSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editSocialMedia = async (req, res) => {
  try {

    let data = req.body
    var obj = {
      name : data.name,
    }

      console.log(data);
      let socialId = req.body.social_id;
      var getData =  await db.getItem(socialId, SocialMediaSchema)
      if(getData){
      if(req.files && req.files.image){
          // if(getData.image!=null && getData.image!=''){
          //     var unfluck = await db.fileUnlinkFormServer(SOCIALMEDIA_IMAGE + '/'+getData.image)
          // }

          var image_name = await db.uploadImage({
              image_data: req.files.image,
              path: SOCIALMEDIA_IMAGE
          })
          req.body.image = image_name;
      }
      const update = await db.updateItem(socialId,SocialMediaSchema,data)

      res.status(200).json({
          code: 200,
          response_data: update
      })
    } else {
      res.status(404).json({
        code: 404,
        message: 'Data Not Found'
    })
    }





  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.deleteSocialMedia = async (req,res) =>{
  try{
    var getData =  await db.getItem(req.body.social_id, SocialMediaSchema)
    if(getData.image!=null && getData.image!=''){
      var unfluck = await db.fileUnlinkFormServer(SOCIALMEDIA_IMAGE + '/'+getData.image)
  }

      var deleteData = await db.deleteItem(req.body.social_id, SocialMediaSchema)
      res.status(200).json({
          code: 200,
          message :"Data Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.addSpecialities = async (req, res) => {
  try {
    var data = req.body;
    console.log('create Content===============', data)
    const dataCheck = await db.checkItem(data, SpecialitiesSchema);
    // console.log('daat check=======', dataCheck);
    if(!dataCheck){
    const obj = await db.createItem(data, SpecialitiesSchema);
    res.status(201).json({
      code: 201,
      response_data:obj,
      message:'Data added successfully'
    })
  }else{
    res.status(409).json({
      code: 409,
      message:'Data already Exits!!!'
    })
  }
  } catch (error) {
    console.log(error);
    utils.handleError(res, error)
  }
}


exports.getSpecialitiesList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getCategoryItemPagination(req.body, SpecialitiesSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


exports.editSpecialities = async (req, res) => {
  try {
      const data = req.body
      console.log(data);
      let specialId = data.special_id;

      const update = await db.updateItem(specialId,SpecialitiesSchema,data)

      res.status(200).json({
          code: 200,
          response_data: update
      })
  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.deleteSpecialities = async (req,res) =>{
  try{
      var deleteData = await db.deleteItem(req.body.special_id, SpecialitiesSchema)
      res.status(200).json({
          code: 200,
          message :"Data Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleSpecialities = async (req,res) =>{
  try{
      var deletesData = await db.deleteItems(req.body.special_id_arr, SpecialitiesSchema)
      res.status(200).json({
          code: 200,
          message :"Data are Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/***************************
 *  Common Service         *
 ***************************/

exports.StatusActiveInactive = async (req, res) => {
  try {
      const data = req.body
      console.log(data);
      let data_id = data._id;
      var SchemaName
    if(data.schemaName === 'user'){
      SchemaName = UserSchema
    } else if(data.schemaName === 'coupon'){
      SchemaName = PromoCodeSchema
    } else if(data.schemaName === 'event'){
      SchemaName = EventSchema
    } else if(data.schemaName === 'contractorsSubscription'){
      SchemaName = ContractorsSubscriptionSchema
    } else if(data.schemaName === 'homeinspector'){
      SchemaName = HomeInspectorsSchema
    } else if(data.schemaName === 'contractors'){
      SchemaName = ContractorsSchema
    } else if(data.schemaName === 'service'){
      SchemaName = ServiceSchema
    }
      const update = await db.updateItem(data_id,SchemaName,data)

      res.status(200).json({
          code: 200,
          response_data: update
      })
  } catch (error) {
      utils.handleError(res, error)
  }
}


/***************************
 * End Common Service      *
 ***************************/


/***************************
 *  User service       *
***************************/

exports.RegisterUser = async (req,res) =>{
    try{


      const doesExists = await emailer.emailExists(req.body.email, UserSchema)
      if (!doesExists) {
        if(req.files && req.files.profileImage){
            var image_name = await db.uploadImage({
                image_data: req.files.profileImage,
                path: User_PROFILE
            })
            req.body.profileImage = image_name;
        }
   

          var create = await  db.createItem(req.body, UserSchema)
      //     if(req.body.user_type === 'service_provider'){
      //         var item = {
      //           admin:admin,
      //           email:req.body.email,
      //           name:req.body.name,
      //           template_name: 'user_reg_email_to_admin'
      //       };

      //       var userEmail = {
      //         email:req.body.email,
      //         name:req.body.name,
      //         template_name: 'service_provider_reg_email'
      //     };
      //     emailer.userRegistrationEmail(userEmail)
      //     emailer.userRegistrationEmailToAdmin(item)

      // }
      res.status(201).json({
        status:true,
        code: 201,
        message :"Registration Successfully",
        data:create
    });
    }
    }catch(error){
        utils.handleError(res, error)
    }
}


exports.EditUser = async (req, res) => {
  try {
    console.log(req.body)

      let userId = req.body.user_id;
      var getData =  await db.getItem(userId, UserSchema)
      if(getData){
      if(req.files && req.files.profileImage){
          if(getData.profileImage!=null && getData.profileImage!=''){
              var unfluck = await db.fileUnlinkFormServer(USER_PROFILE + '/'+getData.profileImage)
          }

          var image_name = await db.uploadImage({
              image_data: req.files.profileImage,
              path: USER_PROFILE
          })
          req.body.profileImage = image_name;
      }
      if(req.body.lng){
          req.body.location = {
            type: 'Point',
            coordinates: [req.body.lng, req.body.lat]
        }
      }
      const update = await db.updateItem(userId,UserSchema,req.body)

      res.status(200).json({
          code: 200,
          response_data: update,
          message:'Profile update successfully'
      })
      return
    }else{
      res.status(404).json({
        code: 404,
        message: 'Data Not Found'
    })

    }
  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.changePasswordUser = async (req, res) => {
    try {
        console.log(req.body);
        // const data = matchedData(req)
        // const token = req.headers.authorization.replace('Bearer ', '').trim()
        // let userId = await getUserIdFromToken(token)
        // console.log('here: ', userId);
        var userId = req.body.user_id
        const userDetails = await db.getItem(userId, UserSchema)
        const isPasswordMatch = await auth.checkPassword(req.body.oldPassword, userDetails);
        if (!isPasswordMatch) {
            res.status(404).json({ code: 404, message: 'Incorrect old password' })
        } else {
            userDetails.password = req.body.password
            userDetails.save(async (err, item) => {
            if (err) res.status(500).json({ code: 500, message: 'Something went wrong' });
                // var admin = await findAdminByToken(userId)
                res.status(200).json({ code: 200, message: 'Password updated successfully'})
            })
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.GetUserList = async (req,res) =>{
    try{
        console.log('---------',req.body)
        var send = await db.getAllUserItemPagination(req.body, UserSchema)
        res.status(200).json({
            code: 200,
            message :"Data fetch successfully",
            response_data:send
        });

    }catch(error){
        utils.handleError(res, error)
    }
}


exports.DeleteUser = async (req,res) =>{
  try{
     var userId = req.body.user_id
    var getData =  await db.getItem(userId, UserSchema)
    if(getData.profileImage!=null && getData.profileImage!=''){
      var unfluck = await db.fileUnlinkFormServer(USER_PROFILE + '/'+getData.profileImage)
    }

      var getDelete = await db.deleteItem(userId, UserSchema)
      res.status(200).json({
          code: 200,
          message :"Record Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleUser = async (req,res) =>{
  try{
    var getDeletesData = await UserSchema.find({
      _id: {
        $in: req.body.user_id_arr
      }
    })
    _.map(getDeletesData,async(files)=>{
      if(getDeletesData.profileImage!=null && getDeletesData.profileImage!=''){
        var unfluck = await db.fileUnlinkFormServer(USER_PROFILE + '/'+getDeletesData.profileImage)
    }

  });

      var getDeletes = await db.deleteItems(req.body.user_id_arr, UserSchema)
      res.status(200).json({
          code: 200,
          message :"Records Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/***************************
 * End User service    *
***************************/

/***************************
 *  Realtors service       *
***************************/

exports.RegisterBuyers = async (req,res) =>{
    try{


      const doesExists = await emailer.emailExists(req.body.email, BuyersSchema)
      if (!doesExists) {
        if(req.files && req.files.profileImage){
            var image_name = await db.uploadImage({
                image_data: req.files.profileImage,
                path: BUYERS_PROFILE
            })
            req.body.profileImage = image_name;
        }
        if(req.body.lng){
          req.body.location = {
            type: 'Point',
            coordinates: [req.body.lng, req.body.lat]
          }
        }

          var create = await  db.createItem(req.body, BuyersSchema)
      //     if(req.body.user_type === 'service_provider'){
      //         var item = {
      //           admin:admin,
      //           email:req.body.email,
      //           name:req.body.name,
      //           template_name: 'user_reg_email_to_admin'
      //       };

      //       var userEmail = {
      //         email:req.body.email,
      //         name:req.body.name,
      //         template_name: 'service_provider_reg_email'
      //     };
      //     emailer.userRegistrationEmail(userEmail)
      //     emailer.userRegistrationEmailToAdmin(item)

      // }
      res.status(201).json({
        status:true,
        code: 201,
        message :"Registration Successfully",
        data:create
    });
    }
    }catch(error){
        utils.handleError(res, error)
    }
}


exports.EditBuyers = async (req, res) => {
  try {
    console.log(req.body)

      let userId = req.body.buyers_id;
      var resData =  await db.getItem(userId, BuyersSchema)
      if(resData){
      if(req.files && req.files.profileImage){
          if(resData.profileImage!=null && resData.profileImage!=''){
              var unfluck = await db.fileUnlinkFormServer(BUYERS_PROFILE + '/'+resData.profileImage)
          }

          var image_name = await db.uploadImage({
              image_data: req.files.profileImage,
              path: BUYERS_PROFILE
          })
          req.body.profileImage = image_name;
      }
      if(req.body.lng){
          req.body.location = {
            type: 'Point',
            coordinates: [req.body.lng, req.body.lat]
        }
      }
      const update = await db.updateItem(userId,BuyersSchema,req.body)

      res.status(200).json({
          code: 200,
          response_data: update,
          message:'Profile update successfully'
      })
      return
    }else{
      res.status(404).json({
        code: 404,
        message: 'Data Not Found'
    })

    }
  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.changePasswordBuyers = async (req, res) => {
    try {
        console.log(req.body);
        // const data = matchedData(req)
        // const token = req.headers.authorization.replace('Bearer ', '').trim()
        // let userId = await getUserIdFromToken(token)
        // console.log('here: ', userId);
        var userId = req.body.buyers_id
        const userDetails = await db.getItem(userId, BuyersSchema)
        const isPasswordMatch = await auth.checkPassword(req.body.oldPassword, userDetails);
        if (!isPasswordMatch) {
            res.status(404).json({ code: 404, message: 'Incorrect old password' })
        } else {
            userDetails.password = req.body.password
            userDetails.save(async (err, item) => {
            if (err) res.status(500).json({ code: 500, message: 'Something went wrong' });
                res.status(200).json({ code: 200, message: 'Password updated successfully' })
            })
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.GetBuyersList = async (req,res) =>{
    try{
        console.log('---------',req.body)
        var send = await db.getAllUserItemPagination(req.body, BuyersSchema)
        res.status(200).json({
            code: 200,
            message :"Data fetch successfully",
            response_data:send
        });

    }catch(error){
        utils.handleError(res, error)
    }
}


exports.DeleteBuyers = async (req,res) =>{
  try{
     var userId = req.body.buyers_id
    var getData =  await db.getItem(userId, BuyersSchema)
    if(getData.profileImage!=null && getData.profileImage!=''){
      var unfluck = await db.fileUnlinkFormServer(BUYERS_PROFILE + '/'+getData.profileImage)
    }

      var getDelete = await db.deleteItem(userId, BuyersSchema)
      res.status(200).json({
          code: 200,
          message :"Record Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleBuyers = async (req,res) =>{
  try{
    var getDeletesData = await BuyersSchema.find({
      _id: {
        $in: req.body.buyers_id_arr
      }
    })
    _.map(getDeletesData,async(files)=>{
      if(getDeletesData.profileImage!=null && getDeletesData.profileImage!=''){
        var unfluck = await db.fileUnlinkFormServer(BUYERS_PROFILE + '/'+getDeletesData.profileImage)
    }

  });

      var getDeletes = await db.deleteItems(req.body.buyers_id_arr, BuyersSchema)
      res.status(200).json({
          code: 200,
          message :"Records Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/***************************
 * End Realtors service    *
***************************/

/**************************************
 * Home Inspect Subscription service  *
***************************************/

exports.addHomeInspectSubscription = async (req,res) =>{
  try{
    let data = req.body
    var obj = {
      name : data.name,
      subscription_type : data.subscription_type,
    }
    const dataCheck = await db.checkItem(obj, HomeInspectSubscriptionSchema);
    if(!dataCheck){

    const object = await db.createItem(req.body, HomeInspectSubscriptionSchema);
    res.status(201).json({
      code: 201,
      response_data:object
    })
  }else{
    res.status(409).json({
      code: 409,
      message:'Data already Exits!!!'
    })
  }




  }catch(error){
      utils.handleError(res, error)
  }
}

exports.getHomeInspectSubscriptionList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getItemPagination(req.body, HomeInspectSubscriptionSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editHomeInspectSubscription = async (req, res) => {
  try {
    let data = req.body


    const object = await db.updateItem(data.subs_id,HomeInspectSubscriptionSchema,req.body)
    res.status(200).json({
      code: 200,
      response_data:object
    })


  } catch (error) {
      utils.handleError(res, error)
  }
}

exports.deleteHomeInspectSubscription = async (req,res) =>{
  try{

      var dataDelete = await db.deleteItem(req.body.subs_id, HomeInspectSubscriptionSchema)
      res.status(200).json({
          code: 200,
          message :"Data Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/*****************************************
 * End Home Inspect Subscription service *
******************************************/

/**************************************
 * Home Inspect Subscription service  *
***************************************/

exports.addContractorsSubscription = async (req,res) =>{
  try{
    let data = req.body
    var obj = {
      name : data.name,
      subscription_type : data.subscription_type,
    }
    const dataCheck = await db.checkItem(obj, ContractorsSubscriptionSchema);
    if(!dataCheck){

    const object = await db.createItem(req.body, ContractorsSubscriptionSchema);
    res.status(201).json({
      code: 201,
      response_data:object
    })
  }else{
    res.status(409).json({
      code: 409,
      message:'Data already Exits!!!'
    })
  }




  }catch(error){
      utils.handleError(res, error)
  }
}

exports.getContractorsSubscriptionList = async (req,res) =>{
  try{
      console.log('---------',req.body)
      var send = await db.getItemPagination(req.body, ContractorsSubscriptionSchema)
      res.status(200).json({
          code: 200,
          message :"Data fetch successfully",
          response_data:send
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.editContractorsSubscription = async (req, res) => {
  try {
    let data = req.body


    const object = await db.updateItem(data.subs_id,ContractorsSubscriptionSchema,req.body)
    res.status(200).json({
      code: 200,
      response_data:object
    })


  } catch (error) {
      utils.handleError(res, error)
  }
}

exports.deleteContractorsSubscription = async (req,res) =>{
  try{

      var dataDelete = await db.deleteItem(req.body.subs_id, ContractorsSubscriptionSchema)
      res.status(200).json({
          code: 200,
          message :"Data Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/*****************************************
 * End Home Inspect Subscription service *
******************************************/


/***************************
 *  Contractors service       *
***************************/

exports.RegisterContractors = async (req,res) =>{
    try{


      const doesExists = await emailer.emailExists(req.body.email, ContractorsSchema)
      if (!doesExists) {
        if(req.files && req.files.profileImage){
            var image_name = await db.uploadImage({
                image_data: req.files.profileImage,
                path: CONTRACTORS_PROFILE
            })
            req.body.profileImage = image_name;
        }
        if(req.body.lng){
          req.body.location = {
            type: 'Point',
            coordinates: [req.body.lng, req.body.lat]
          }
        }

          var create = await  db.createItem(req.body, ContractorsSchema)
      //     if(req.body.user_type === 'service_provider'){
      //         var item = {
      //           admin:admin,
      //           email:req.body.email,
      //           name:req.body.name,
      //           template_name: 'user_reg_email_to_admin'
      //       };

      //       var userEmail = {
      //         email:req.body.email,
      //         name:req.body.name,
      //         template_name: 'service_provider_reg_email'
      //     };
      //     emailer.userRegistrationEmail(userEmail)
      //     emailer.userRegistrationEmailToAdmin(item)

      // }
      res.status(201).json({
        status:true,
        code: 201,
        message :"Registration Successfully",
        data:create
    });
    }
    }catch(error){
        utils.handleError(res, error)
    }
}


exports.EditContractors = async (req, res) => {
  try {
    console.log(req.body)

      let userId = req.body.contractors_id;
      var realtorsData =  await db.getItem(userId, ContractorsSchema)
      if(realtorsData){
      if(req.files && req.files.profileImage){
          if(realtorsData.profileImage!=null && realtorsData.profileImage!=''){
              var unfluck = await db.fileUnlinkFormServer(CONTRACTORS_PROFILE + '/'+realtorsData.profileImage)
          }

          var image_name = await db.uploadImage({
              image_data: req.files.profileImage,
              path: CONTRACTORS_PROFILE
          })
          req.body.profileImage = image_name;
      }
      if(req.body.lng){
          req.body.location = {
            type: 'Point',
            coordinates: [req.body.lng, req.body.lat]
        }
      }
      const update = await db.updateItem(userId,ContractorsSchema,req.body)

      res.status(200).json({
          code: 200,
          response_data: update,
          message:'Profile update successfully'
      })
      return
    }else{
      res.status(404).json({
        code: 404,
        message: 'Data Not Found'
    })

    }
  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.changePasswordContractors = async (req, res) => {
    try {
        console.log(req.body);
        // const data = matchedData(req)
        // const token = req.headers.authorization.replace('Bearer ', '').trim()
        // let userId = await getUserIdFromToken(token)
        // console.log('here: ', userId);
        var userId = req.body.contractors_id
        const userDetails = await db.getItem(userId, ContractorsSchema)
        const isPasswordMatch = await auth.checkPassword(req.body.oldPassword, userDetails);
        if (!isPasswordMatch) {
            res.status(404).json({ code: 404, message: 'Incorrect old password' })
        } else {
            userDetails.password = req.body.password
            userDetails.save(async (err, item) => {
            if (err) res.status(500).json({ code: 500, message: 'Something went wrong' });
                // var admin = await findAdminByToken(userId)
                res.status(200).json({ code: 200, message: 'Password updated successfully'})
            })
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.GetContractorsList = async (req,res) =>{
    try{
        console.log('---------',req.body)
        var send = await db.getAllUserItemPagination(req.body, ContractorsSchema)
        res.status(200).json({
            code: 200,
            message :"Data fetch successfully",
            response_data:send
        });

    }catch(error){
        utils.handleError(res, error)
    }
}


exports.DeleteContractors = async (req,res) =>{
  try{
     var userId = req.body.contractors_id
    var getData =  await db.getItem(userId, ContractorsSchema)
    if(getData.profileImage!=null && getData.profileImage!=''){
      var unfluck = await db.fileUnlinkFormServer(CONTRACTORS_PROFILE + '/'+getData.profileImage)
    }

      var getDelete = await db.deleteItem(userId, ContractorsSchema)
      res.status(200).json({
          code: 200,
          message :"Record Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleContractors = async (req,res) =>{
  try{
    var getDeletesData = await ContractorsSchema.find({
      _id: {
        $in: req.body.contractors_id_arr
      }
    })
    _.map(getDeletesData,async(files)=>{
      if(getDeletesData.profileImage!=null && getDeletesData.profileImage!=''){
        var unfluck = await db.fileUnlinkFormServer(CONTRACTORS_PROFILE + '/'+getDeletesData.profileImage)
    }

  });

      var getDeletes = await db.deleteItems(req.body.contractors_id_arr, ContractorsSchema)
      res.status(200).json({
          code: 200,
          message :"Records Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/***************************
 * End Contractors service    *
***************************/

/***************************
 *  Home Inspectors service       *
***************************/

exports.RegisterHomeInspectors = async (req,res) =>{
    try{


      const doesExists = await emailer.emailExists(req.body.email, HomeInspectorsSchema)
      if (!doesExists) {
        if(req.files && req.files.profileImage){
            var image_name = await db.uploadImage({
                image_data: req.files.profileImage,
                path: HOMEINSPECTORS_PROFILE
            })
            req.body.profileImage = image_name;
        }
        if(req.body.lng){
          req.body.location = {
            type: 'Point',
            coordinates: [req.body.lng, req.body.lat]
          }
        }

          var create = await  db.createItem(req.body, HomeInspectorsSchema)
      //     if(req.body.user_type === 'service_provider'){
      //         var item = {
      //           admin:admin,
      //           email:req.body.email,
      //           name:req.body.name,
      //           template_name: 'user_reg_email_to_admin'
      //       };

      //       var userEmail = {
      //         email:req.body.email,
      //         name:req.body.name,
      //         template_name: 'service_provider_reg_email'
      //     };
      //     emailer.userRegistrationEmail(userEmail)
      //     emailer.userRegistrationEmailToAdmin(item)

      // }
      res.status(201).json({
        status:true,
        code: 201,
        message :"Registration Successfully",
        data:create
    });
    }
    }catch(error){
        utils.handleError(res, error)
    }
}


exports.EditHomeInspectors = async (req, res) => {
  try {
    console.log(req.body)

      let userId = req.body.home_id;
      var resData =  await db.getItem(userId, HomeInspectorsSchema)
      if(resData){
      if(req.files && req.files.profileImage){
          if(resData.profileImage!=null && resData.profileImage!=''){
              var unfluck = await db.fileUnlinkFormServer(HOMEINSPECTORS_PROFILE + '/'+resData.profileImage)
          }

          var image_name = await db.uploadImage({
              image_data: req.files.profileImage,
              path: HOMEINSPECTORS_PROFILE
          })
          req.body.profileImage = image_name;
      }
      if(req.body.lng){
          req.body.location = {
            type: 'Point',
            coordinates: [req.body.lng, req.body.lat]
        }
      }
      const update = await db.updateItem(userId,HomeInspectorsSchema,req.body)

      res.status(200).json({
          code: 200,
          response_data: update,
          message:'Profile update successfully'
      })
      return
    }else{
      res.status(404).json({
        code: 404,
        message: 'Data Not Found'
    })

    }
  } catch (error) {
      utils.handleError(res, error)
  }
}


exports.changePasswordHomeInspectors = async (req, res) => {
    try {
        console.log(req.body);
        // const data = matchedData(req)
        // const token = req.headers.authorization.replace('Bearer ', '').trim()
        // let userId = await getUserIdFromToken(token)
        // console.log('here: ', userId);
        var userId = req.body.home_id
        const userDetails = await db.getItem(userId, HomeInspectorsSchema)
        const isPasswordMatch = await auth.checkPassword(req.body.oldPassword, userDetails);
        if (!isPasswordMatch) {
            res.status(404).json({ code: 404, message: 'Incorrect old password' })
        } else {
            userDetails.password = req.body.password
            userDetails.save(async (err, item) => {
            if (err) res.status(500).json({ code: 500, message: 'Something went wrong' });
                res.status(200).json({ code: 200, message: 'Password updated successfully' })
            })
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.GetHomeInspectorsList = async (req,res) =>{
    try{
        console.log('---------',req.body)
        var send = await db.getAllUserItemPagination(req.body, HomeInspectorsSchema)
        res.status(200).json({
            code: 200,
            message :"Data fetch successfully",
            response_data:send
        });

    }catch(error){
        utils.handleError(res, error)
    }
}


exports.DeleteHomeInspectors = async (req,res) =>{
  try{
     var userId = req.body.home_id
    var getData =  await db.getItem(userId, HomeInspectorsSchema)
    if(getData.profileImage!=null && getData.profileImage!=''){
      var unfluck = await db.fileUnlinkFormServer(HOMEINSPECTORS_PROFILE + '/'+getData.profileImage)
    }

      var getDelete = await db.deleteItem(userId, HomeInspectorsSchema)
      res.status(200).json({
          code: 200,
          message :"Record Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleHomeInspectors = async (req,res) =>{
  try{
    var getDeletesData = await HomeInspectorsSchema.find({
      _id: {
        $in: req.body.home_id_arr
      }
    })
    _.map(getDeletesData,async(files)=>{
      if(getDeletesData.profileImage!=null && getDeletesData.profileImage!=''){
        var unfluck = await db.fileUnlinkFormServer(HOMEINSPECTORS_PROFILE + '/'+getDeletesData.profileImage)
    }

  });

      var getDeletes = await db.deleteItems(req.body.home_id_arr, HomeInspectorsSchema)
      res.status(200).json({
          code: 200,
          message :"Records Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/***************************
 * Home Inspectors service    *
***************************/


/***************************
 *  Manage  service       *
***************************/

exports.AddEvent = async (req,res) =>{
  try{
    let data = req.body

    const object = await db.createItem(req.body, EventSchema);
    res.status(201).json({
      code: 201,
      response_data:object
    })





  }catch(error){
      utils.handleError(res, error)
  }
}


exports.EditEvent = async (req, res) => {
  try {
    console.log(req.body)

      let userId = req.body.event_id;
      var resData =  await db.getItem(userId, EventSchema)
      if(resData){

      const update = await db.updateItem(userId,EventSchema,req.body)

      res.status(200).json({
          code: 200,
          response_data: update,
          message:'Data update successfully'
      })
      return
    }else{
      res.status(404).json({
        code: 404,
        message: 'Data Not Found'
    })

    }
  } catch (error) {
      utils.handleError(res, error)
  }
}



exports.GetEventList = async (req,res) =>{
    try{
        console.log('---------',req.body)
        var send = await db.getAllUserItemPagination(req.body, EventSchema)
        res.status(200).json({
            code: 200,
            message :"Data fetch successfully",
            response_data:send
        });

    }catch(error){
        utils.handleError(res, error)
    }
}


exports.DeleteEvent = async (req,res) =>{
  try{
     var userId = req.body.event_id
  
      var getDelete = await db.deleteItem(userId, EventSchema)
      res.status(200).json({
          code: 200,
          message :"Record Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleEvent = async (req,res) =>{
  try{


      var getDeletes = await db.deleteItems(req.body.event_id_arr, EventSchema)
      res.status(200).json({
          code: 200,
          message :"Records Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/***************************
 * End Realtors service    *
***************************/


/***************************
 *  Room service       *
***************************/

exports.AddRoom = async (req,res) =>{
    try{


    
        if(req.files && req.files.image){
            var image_name = await db.uploadImage({
                image_data: req.files.image,
                path: ROOM_IMAGE
            })
            req.body.image = image_name;
        }
    
        if(req.files && req.files.video){
            var image_name = await db.uploadImage({
                image_data: req.files.video,
                path: ROOM_IMAGE
            })
            req.body.video = image_name;
        }
    
        if(req.files && req.files.image_360_degree){
            var image_name = await db.uploadImage({
                image_data: req.files.image_360_degree,
                path: ROOM_IMAGE
            })
            req.body.image_360_degree = image_name;
        }


          var create = await  db.createItem(req.body, RoomSchema)

      res.status(201).json({
        status:true,
        code: 201,
        message :"Registration Successfully",
        data:create
    });
  
    }catch(error){
        utils.handleError(res, error)
    }
}


exports.EditRoom = async (req, res) => {
  try {
    console.log(req.body)

      let userId = req.body.room_id;
      var getsData =  await db.getItem(userId, RoomSchema)
      if(getsData){
      if(req.files && req.files.image){
          if(getsData.image!=null && getsData.image!=''){
              var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getsData.image)
          }

          var image_name = await db.uploadImage({
              image_data: req.files.image,
              path: ROOM_IMAGE
          })
          req.body.image = image_name;
      }
      if(req.files && req.files.video){
          if(getsData.video!=null && getsData.video!=''){
              var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getsData.video)
          }

          var image_name = await db.uploadImage({
              image_data: req.files.video,
              path: ROOM_IMAGE
          })
          req.body.video = image_name;
      }
      if(req.files && req.files.image_360_degree){
          if(getsData.image_360_degree!=null && getsData.image_360_degree!=''){
              var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getsData.image_360_degree)
          }

          var image_name = await db.uploadImage({
              image_data: req.files.image_360_degree,
              path: ROOM_IMAGE
          })
          req.body.image_360_degree = image_name;
      }
  
      const update = await db.updateItem(userId,RoomSchema,req.body)

      res.status(200).json({
          code: 200,
          response_data: update,
          message:'Profile update successfully'
      })
      return
    }else{
      res.status(404).json({
        code: 404,
        message: 'Data Not Found'
    })

    }
  } catch (error) {
      utils.handleError(res, error)
  }
}



exports.GetRoomList = async (req,res) =>{
    try{
        console.log('---------',req.body)
        var send = await db.getAllUserItemPagination(req.body, RoomSchema)
        res.status(200).json({
            code: 200,
            message :"Data fetch successfully",
            response_data:send
        });

    }catch(error){
        utils.handleError(res, error)
    }
}


exports.DeleteRoom = async (req,res) =>{
  try{
     var userId = req.body.room_id
    var getData =  await db.getItem(userId, RoomSchema)
    if(getData.image!=null && getData.image!=''){
      var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getData.image)
    }
    if(getData.video!=null && getData.video!=''){
      var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getData.video)
    }
    if(getData.image_360_degree!=null && getData.image_360_degree!=''){
      var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getData.image_360_degree)
    }

      var getDelete = await db.deleteItem(userId, RoomSchema)
      res.status(200).json({
          code: 200,
          message :"Record Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}

exports.deleteMultipleRoom = async (req,res) =>{
  try{
    var getDeletesData = await RoomSchema.find({
      _id: {
        $in: req.body.room_id_arr
      }
    })
    _.map(getDeletesData,async(files)=>{
     if(getData.image!=null && getData.image!=''){
      var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getData.image)
    }
     if(getData.video!=null && getData.video!=''){
      var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getData.video)
    }
    if(getData.image_360_degree!=null && getData.image_360_degree!=''){
      var unfluck = await db.fileUnlinkFormServer(ROOM_IMAGE + '/'+getData.image_360_degree)
    }

  });

      var getDeletes = await db.deleteItems(req.body.room_id_arr, RoomSchema)
      res.status(200).json({
          code: 200,
          message :"Records Deleted successfully",
      });

  }catch(error){
      utils.handleError(res, error)
  }
}


/***************************
 * End Room service    *
***************************/
