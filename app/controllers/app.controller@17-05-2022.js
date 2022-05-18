const jwt = require('jsonwebtoken')
const utils = require('../middleware/utils')
const uuid = require('uuid')
const moment = require('moment')
const { addHours } = require('date-fns')
const { matchedData } = require('express-validator')
const auth = require('../middleware/admin.auth')
const HOURS_TO_BLOCK = 2
const LOGIN_ATTEMPTS = 5
const db = require('../middleware/app.db')
const fs = require('fs');
const emailer = require('../middleware/admin-emailer')
var _ = require('underscore');
var stripe = require('stripe')(process.env.STRIPE_SK)
/********************
 * Call Models *
 ********************/
 const Admin = require('../models/admin.model')
 const UserSchema = require('../models/user')

const { default: roundToNearestMinutes } = require('date-fns/roundToNearestMinutes')
/********************
 * Define Images Paths *
 ********************/



 const AMIN_PROFILE = 'public/adminProfile'
 const MENUS_IMAGE = 'public/menus'
 const GALLERY_IMAGE = 'public/gallery'
 const USER_PROFILE = 'public/userProfile'

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
 const randomPassswordCreate = async length => {
  return new Promise((resolve, reject) => {
	var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var result = "";
	for (var i = length; i > 0; --i)
		result += chars[Math.round(Math.random() * (chars.length - 1))];
    resolve(result);


})
}
const findAdmin = async email => {
    return new Promise((resolve, reject) => {
        Admin.findOne(
        {
            email
        },
        'name email password location profileImage  dob gender address  phone hobbiest dislicks',
        (err, item) => {
            utils.itemNotFound(err, item, reject, 'ADMIN_DOES_NOT_EXIST')
            resolve(item)
        }
        )
    })
}

const findAdminByToken = async id => {
    return new Promise((resolve, reject) => {
        Admin.findOne(
        {

        },
        'name  loginAttempts blockExpires password email dob profile_image role verified verification phone permission reset_pass_verified',
        (err, item) => {
            utils.itemNotFound(err, item, reject, 'ADMIN_DOES_NOT_EXIST')
            resolve(item)
        }
        )
    })
}
const findUserByToken = async id => {
    return new Promise((resolve, reject) => {
        UserSchema.findById(
        {
            _id: id
        },
        'name email password location profileImage  dob gender address  phone hobbiest dislicks',
        (err, item) => {
            utils.itemNotFound(err, item, reject, 'User Does Not Exist')
            resolve(item)
        }
        )
    })
}

const findRestaurantByToken = async id => {
  return new Promise((resolve, reject) => {
      RestaurantSchema.findById(
      {
          _id: id
      },
      'name location status isActive address state state_id specialities city webUrl logo updatedAt createdAt lat lng email verification verified phone isSubscription subscriptionStorage subscriptionExpireDate',
      (err, item) => {
          utils.itemNotFound(err, item, reject, 'User Does Not Exist')
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
            resolve(utils.buildErrObject(409, 'WRONG PASSWORD'))
        } else {
            resolve(blockUser(user))
        }
        reject(utils.buildErrObject(422, 'ERROR'))
    })
}


const returnUserToken = async (req) => {
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
        user.decoded_password = password;
        user.reset_pass_verified = true;
        user.save((err, item) => {
            utils.itemNotFound(err, item, reject, 'NOT_FOUND')
            resolve({ data: item, code: 200, status: true })
        })
    })
}

async function checkToken(id) {
	try{
    console.log('token id=======================check=', id)
		const token = await stripe.tokens.retrieve(
			id
			);
      console.log('token token=======================check=', token)

		if(token.used){
			return false;

		}else {
			return true
		}
	} catch(err) {
		return false;
	}
}
async function OTP4Digit() {
    // console.log('token = ', token)
    return new Promise((resolve, reject) => {
        var val = Math.floor(1000 + Math.random() * 9000);

     
            resolve(val)
      
    })
}

async function OTP5Digit() {
    // console.log('token = ', token)
    return new Promise((resolve, reject) => {
        var val = Math.floor(10000 + Math.random() * 90000);

     
            resolve(val)
      
    })
}


/********************
 * Exports functions *
 ********************/

 exports.UserLogin = async (req, res) => {
    try {
        const data = req.body
        console.log(data);

        const user = await db.getItemByEmail(data.email, UserSchema)
        console.log('Org found', user);

        //await userIsBlocked(user)
        // await orgIsVerified(org)
        // await checkLoginAttemptsAndBlockExpires(user)
        const isPasswordMatch = await auth.checkPassword(data.password, user)
        if (!isPasswordMatch) {
            utils.handleError(res, await passwordsDoNotMatch(user))
        } else {
            delete user.password
            if (data.device_token){
                user.device_token = data.device_token
                const update = await db.updateItem(user._id,User,user)
            }

            user.loginAttempts = 0
            //await saveLoginAttemptsToDB(org)


            // all ok, register access and return token
            res.status(200).json(await returnUserToken(user))
        }
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.userDetails = async (req, res) => {
    try {
        // console.log('-----------',req.headers)
        const data = matchedData(req)
        // console.log(data);
        const token = req.headers.authorization.replace('Bearer ', '').trim()
        let userId = await getUserIdFromToken(token)
        const user = await findUserByToken(userId)
        // console.log('Org found', user);
        res.status(200).json({
            code: 200,
            data: user,
            success:true
        })
    } catch (error) {
        utils.handleError(res, error)
    }
}


exports.register = async (req,res) =>{
    try{
        console.log('req.body=================', req.body)
          // const admin = await findAdminByToken('withoutid')
          const doesExists = await emailer.emailExists(req.body.email, UserSchema)
          console.log('doesExists==================', doesExists)
          if (!doesExists) {


            if(req.files && req.files.profileImage){
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
            if(req.body.password){
                req.body.dec_password = req.body.password
            }


            // var otp = await OTP4Digit()
            // console.log('otp=====================', otp)
            // req.body.otp = otp

          var create = await  db.createItem(req.body, UserSchema)



            //   var item = {
            //     admin:admin,
            //     email:req.body.email,
            //     name:req.body.name,
            //     template_name: 'user_reg_email_to_admin'
            // };
          //   var userEmail = {
          //     email:req.body.email,
          //     otp: otp,
          //     name: req.body.name,
          //     template_name: 'registration_otp'
          // };
          // emailer.userRegistrationOTP(userEmail)
            create.dec_password = undefined;

            var start = moment().startOf('day'); // set to 12:00 am today
            var end = moment().endOf('day'); // set to 23:59 pm today
            console.log('start-----------', start)
            console.log('end-----------', end)



          res.status(201).json({
            success: true,
            code: 201,
            message :"Registration successfully",
            data:await returnUserToken(create)
        });
          return
        }
    }catch(error){
          res.send({
            success: false,
            error: error
        });
        console.log('error-------------------------', error)
        return
        // utils.handleError(res, error)
    }
}



exports.forgotPassword = async (req, res) => {
    try {
        // Gets locale from header 'Accept-Language'
        const locale = req.getLocale()
        const data = req.body
        console.log(data);
        var user = await db.getItemByEmail(data.email, UserSchema)
        console.log('user----------------',user)
 
        if(user.success === false){
            res.status(200).json({ code: 200, message:user.msg, success:false });
            return
        }
        var otp = await OTP4Digit()
        console.log('otp=====================', otp)
            var field = {
                otp : otp
            }
        const update = await db.updateItem(user._id,UserSchema,field)
        var userEmail1 = {
              email:user.email,
              otp: otp,
              name: user.name,
              template_name: 'forgot_password_otp'
            };
            emailer.userForgotPasswordOTP(userEmail1)
            res.status(200).json({
                success: true,
                code: 200,
                message :"Please check your email for OTP verification code.",
                user_id:user._id,
                otp: otp,
            });
            return

    } catch (error) {
      console.log('error===========', error);
        utils.handleError(res, error)
    }
}


exports.ResendOTP = async (req,res) =>{
    try{
        var data = req.body

        console.log('data====================', data)
        var userData = await UserSchema.findOne({email:data.email})
        if(userData){
        var otp = await OTP4Digit()
        console.log('otp=====================', otp)
        var field = {
            otp : otp
        }
        const update = await db.updateItem(userData._id,UserSchema,field)
        var userEmail = {
          email:userData.email,
          otp: otp,
          name: userData.name,
          template_name: 'forgot_password_otp'
      };
      emailer.userForgotPasswordOTP(userEmail)

           
         res.status(200).json({
                success: true,
                code: 200,
                message :"Please check your email for OTP verification code.",
                user_id:userData._id,
                otp: otp,
            });
         return
        
    }else{ 
              
        res.status(200).json({ code: 200, message:'"INVALID EMAIL"', success:false });
        return
            
    }

    }catch(error){
        utils.handleError(res, error)
    }
}


exports.ResetPassword = async (req, res) => {
    try {
        var data = req.body
        if(!data.password){
            res.status(200).json({
                code: 200,
                message: 'Please enter the password',
                success:false
            })
            return
        }
        console.log('data====================', data)
        var userData = await UserSchema.findOne({email:data.email})

        if(userData){
        // if(userData.dec_password.toString() === data.password.toString()){
        //     res.status(200).json({
        //         code: 200,
        //         message: 'Your new password must be different from your previous used passwords.',
        //         success:false
        //     })
        //     return
        // }

            // userData.dec_password = data.dec_password
            const updateData = await updatePassword(req.body.password, userData)
            res.status(200).json({
                code: 200,
                message: 'Password reset successfully',
                success:true
            })
            return
      
        }else{
               res.status(200).json({
                code: 200,
                message: 'Account not found!!!',
                success:false
            })
               return
        }
      
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.editUser = async (req, res) => {
    try {
        console.log('===============,req.files',req.files)
        console.log('===============,req.body',req.body)

        const data = matchedData(req)
        // console.log(data);
        // let userId = req.body.user_id;
             const token = req.headers.authorization.replace('Bearer ', '').trim()
        let userId = await getUserIdFromToken(token)

        if(req.files && req.files.profileImage){
            var userData =  await findUserByToken(userId)
            if(userData.profileImage!=null && userData.profileImage!=''){
                var unfluck = await db.fileUnlinkFormServer(USER_PROFILE + '/'+userData.profileImage)
            }
            var image_name = await db.uploadImage({
                image_data: req.files.profileImage,
                path: USER_PROFILE
            })
            req.body.profileImage = image_name;
        }
        const update = await db.updateItem(userId,UserSchema,req.body)
        const user = await findUserByToken(userId)
        // console.log('Org found', req.body);

         // const user = await User.findOne({email: data.email}).select('password name email phone zipCode user_type loginAttempts verified')
 // res.status(200).json(await returnUserToken(user))
 res.status(200).json({
            success: true,
            code: 201,
            message :"Registration successfully",
            data:await returnUserToken(user)
        });
          return
 

    } catch (error) {
        utils.handleError(res, error)
    }
}

