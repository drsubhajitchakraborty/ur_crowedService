const User = require('../models/user')
const Admin = require('../models/admin.model')
const UserAccess = require('../models/userAccess')
const ForgotPassword = require('../models/forgotPassword')


const jwt = require('jsonwebtoken')
const utils = require('../middleware/utils')
const uuid = require('uuid')
const { addHours } = require('date-fns')
const { matchedData } = require('express-validator')
const auth = require('../middleware/admin.auth')
const emailer = require('../middleware/emailer')
var fs = require('fs');
const HOURS_TO_BLOCK = 2
const LOGIN_ATTEMPTS = 5
const db = require('../middleware/admin.db')



/*********************
 * Private functions *
 *********************/

/**
 * Generates a token
 * @param {Object} user - user object
 */

const fileUnlinkFormServer = async filePath => {
	fs.unlink(filePath, (err) => {
		if (err) {
			console.log("Error deleting file from server")
		} else {
			console.log("File deleted from server successfully")
		}
	});
}

const generateToken = user => {
  // Gets expiration time
  const expiration =
    Math.floor(Date.now() / 1000) + 60 * 60* process.env.JWT_EXPIRATION_IN_MINUTES

  // returns signed and encrypted token
  return auth.encrypt(
    jwt.sign(
      {
        data: {
          _id: user
        },
        exp: expiration
      },
      process.env.JWT_SECRET
    )
  )
}
const filesImage = async object => {
		// console.log("=-======", object)
		return new Promise((resolve, reject) => {
			var obj = object.image_data;
			// console.log("OBJ", obj)
			var nameFile = Date.now() + obj.name;
			var imageRemoteName = object.path + '/' + nameFile;
			obj.mv(object.path + nameFile, function (err) {
				if (err) {
					console.log(err, "+==")
				}
				// resolve(nameFile.toString())
				console.log("================")
				resolve(nameFile.toString())
			});

		}).catch(err => {
			console.log('failed:', err)
		})
	}
/**
 * Creates an object with user info
 * @param {Object} req - request object
 */
const setUserInfo = req => {
  let user = {
    _id: req._id,
    first_name: req.first_name,
	last_name:req.last_name,
    email: req.email,
	profile_picture:req.profile_picture,
	mobile_number:req.mobile_number,
    role: req.role,
	settings:req.settings,
	churro_points: req.churro_points,
	subscription_plans:req.subscription_plans,
    verified: req.verified
  }
  // Adds verification for testing purposes
  if (process.env.NODE_ENV !== 'production') {
    user = {
      ...user,
      verification: req.verification
    }
  }
  return user
}

const setMaestroUserInfo = req => {
  let maestro = {
    _id: req._id,
    first_name: req.first_name,
	last_name:req.last_name,
    email: req.email,
	profile_picture:req.profile_picture,
	mobile_number:req.mobile_number,
    role: req.role,
	settings:{'notifications':true, 'availability': true},
	churro_points: {'points': 0},
	subscription_plans:{'plan':'Trial'},
	cv_doc:req.cv_doc,
	bank_doc:req.bank_doc,
	maestro_video:req.maestro_video,
	zoom_name:req.zoom_name,
	signature_file:req.signature_file,
	password:req.password,
    verified: req.verified
  }
  // Adds verification for testing purposes
  if (process.env.NODE_ENV !== 'production') {
    maestro = {
      ...maestro,
      verification: req.verification
    }
  }
  return maestro
}
/**
 * Saves a new user access and then returns token
 * @param {Object} req - request object
 * @param {Object} user - user object
 */
const saveUserAccessAndReturnToken = async (req, user) => {
  return new Promise((resolve, reject) => {
    const userAccess = new UserAccess({
      email: user.email,
      ip: utils.getIP(req),
      browser: utils.getBrowserInfo(req),
      country: utils.getCountry(req)
    })
    userAccess.save(err => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      const userInfo = setUserInfo(user)
      // Returns data with access token
      resolve({
        token: generateToken(user._id),
        user: userInfo,
		response: true
      })
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

/**
 * Saves login attempts to dabatabse
 * @param {Object} user - user object
 */
const saveLoginAttemptsToDB = async user => {
  return new Promise((resolve, reject) => {
    user.save((err, result) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      if (result) {
        resolve(true)
      }
    })
  })
}

/**
 * Checks that login attempts are greater than specified in constant and also that blockexpires is less than now
 * @param {Object} user - user object
 */
const blockIsExpired = user =>
  user.loginAttempts > LOGIN_ATTEMPTS && user.blockExpires <= new Date()

/**
 *
 * @param {Object} user - user object.
 */
const checkLoginAttemptsAndBlockExpires = async user => {
  return new Promise((resolve, reject) => {
    // Let user try to login again after blockexpires, resets user loginAttempts
    if (blockIsExpired(user)) {
      user.loginAttempts = 0
      user.save((err, result) => {
        if (err) {
          reject(utils.buildErrObject(422, err.message))
        }
        if (result) {
          resolve(true)
        }
      })
    } else {
      // User is not blocked, check password (normal behaviour)
      resolve(true)
    }
  })
}

/**
 * Checks if blockExpires from user is greater than now
 * @param {Object} user - user object
 */
const userIsVerified = async user =>{
	return new Promise((resolve, reject)=>{
		if (!user.verified) {
			reject(utils.buildErrObject(409, 'EMAIL_NOT_VERIFIED'))
		}
    resolve(true)
	});
}
const userIsBlocked = async user => {
  return new Promise((resolve, reject) => {
    if (user.blockExpires > new Date()) {
      reject(utils.buildErrObject(409, 'BLOCKED_USER'))
    }
    resolve(true)
  })
}

/**
 * Finds user by email
 * @param {string} email - user´s email
 */
const findMaestroPhoneExists= async phone => {
 return new Promise((resolve, reject) => {
    Maestro.findOne(
      {
        mobile_number:phone
      },
      'password loginAttempts blockExpires name email role verified verification mobile_number settings',
      (err, item) => {
       // utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
	   if(item){
        resolve({'response':false, 'message':'phone already in use'});
	   }else{
		resolve({'response':true, 'message':'new phone number'});
	   }
      }
    )
  })
}


const findUserPhoneExists= async phone => {
 return new Promise((resolve, reject) => {
    User.findOne(
      {
        mobile_number:phone
      },
      'password loginAttempts blockExpires name email role verified verification mobile_number settings',
      (err, item) => {
       // utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
	   if(item){
        resolve({'response':false, 'message':'phone already in use'});
	   }else{
		resolve({'response':true, 'message':'new phone number'});
	   }
      }
    )
  })
}

const findUserEmailExists= async email => {
 return new Promise((resolve, reject) => {
    User.findOne(
      {
        email:email
      },
      'password loginAttempts blockExpires name email role verified verification mobile_number settings',
      (err, item) => {
       // utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
	   if(item){
        resolve({'response':false, 'message':'email already in use'});
	   }else{
		resolve({'response':true, 'message':'new email'});
	   }
      }
    )
  })
}

const findMaestroEmailExists= async email => {
 return new Promise((resolve, reject) => {
    Maestro.findOne(
      {
        email:email
      },
      'password loginAttempts blockExpires name email role verified verification mobile_number settings',
      (err, item) => {
       // utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
	   if(item){
        resolve({'response':false, 'message':'email already in use'});
	   }else{
		resolve({'response':true, 'message':'new email'});
	   }
      }
    )
  })
}

const findUserByPhone= async phone => {
 return new Promise((resolve, reject) => {
    User.findOne(
      {
        mobile_number:phone
      },
      'first_name last_name zoom_name cv_doc maestro_video signature_file cv_doc bank_doc profile_picture password loginAttempts blockExpires name email role verified verification mobile_number settings',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
        resolve(item)
      }
    )
  })
}
const findMaestroByPhone= async phone => {
 return new Promise((resolve, reject) => {
    Maestro.findOne(
      {
        mobile_number:phone
      },
      'first_name last_name profile_picture password loginAttempts blockExpires name email role verified verification mobile_number settings cv_doc bank_doc maestro_video ',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
        resolve(item)
      }
    )
  })
}
const findUser = async email => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        email
      },
      'first_name last_name profile_picture password loginAttempts blockExpires name email role verified verification mobile_number settings',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
        resolve(item)
      }
    )
  })
}

const findMaestro = async email => {
  return new Promise((resolve, reject) => {
    Maestro.findOne(
      {
        email
      },
      'first_name last_name profile_picture maestro_video cv_doc password loginAttempts blockExpires name email role verified verification mobile_number settings',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
        resolve(item)
      }
    )
  })
}

const findOrg = async email => {
  return new Promise((resolve, reject) => {
    Organization.findOne(
      {
        email
      },
      'organization_name profile_picture password loginAttempts blockExpires name email role verified verification mobile_number settings',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
        resolve(item)
      }
    )
  })
}

/**
 * Finds user by ID
 * @param {string} id - user´s id
 */
const findUserById = async userId => {
  return new Promise((resolve, reject) => {
    User.findById(userId, (err, item) => {
      utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
      resolve(item)
    })
  })
}

/**
 * Adds one attempt to loginAttempts, then compares loginAttempts with the constant LOGIN_ATTEMPTS, if is less returns wrong password, else returns blockUser function
 * @param {Object} user - user object
 */
const passwordsDoNotMatch = async user => {
  user.loginAttempts += 1
  await saveLoginAttemptsToDB(user)
  return new Promise((resolve, reject) => {
    if (user.loginAttempts <= LOGIN_ATTEMPTS) {
      resolve(utils.buildErrObject(409, 'WRONG_PASSWORD'))
    } else {
      resolve(blockUser(user))
    }
    reject(utils.buildErrObject(422, 'ERROR'))
  })
}

/**
 * Registers a new user in database
 * @param {Object} req - request object
 */


const registerUser = async req => {
  return new Promise((resolve, reject) => {
    const user = new User({
      first_name: req.first_name,
	  last_name:req.last_name,
      email: req.email,
      password: req.password,
	  mobile_number:req.mobile_number,
	  settings:{'notifications':true},
	  churro_points: {'points': 0},
	  subscription_plans:{'plan':'Trial'},
      verification: uuid.v4()
    })
    user.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve(item)
    })
  })
}





/**
 * craete content management a new user in database
 * @param {Object} req - request object
 */
const createContentManagement = async req => {
  return new Promise((resolve, reject) => {
    const contentData = new ContentManagemnt({
      content: req.content,
      content_type: req.content_type
    })
    contentData.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve(item)
    })
  })
}
/**
 * Builds the registration token
 * @param {Object} item - user object that contains created id
 * @param {Object} userInfo - user object
 */
const returnRegisterToken = (item, userInfo) => {
  if (process.env.NODE_ENV !== 'production') {
    userInfo.verification = item.verification
  }
  const data = {
    token: generateToken(item._id),
    user: userInfo,
	response: true
  }
  return data
}

const returnMaestroRegisterToken = (item, userInfo) => {
  if (process.env.NODE_ENV !== 'production') {
    userInfo.verification = item.verification
  }
  const data = {
    token: generateToken(item._id),
    user: userInfo,
	response: true
  }
  return data
}

/**
 * Checks if verification id exists for user
 * @param {string} id - verification id
 */
const verificationExists = async id => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        verification: id,
        verified: false
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND_OR_ALREADY_VERIFIED')
        resolve(user)
      }
    )
  })
}

/**
 * Verifies an user
 * @param {Object} user - user object
 */
const verifyUser = async user => {
  return new Promise((resolve, reject) => {
    user.verified = true
    user.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve({
        email: item.email,
        verified: item.verified
      })
    })
  })
}

/**
 * Marks a request to reset password as used
 * @param {Object} req - request object
 * @param {Object} forgot - forgot object
 */
const markResetPasswordAsUsed = async (req, forgot) => {
  return new Promise((resolve, reject) => {
    forgot.used = true
    forgot.save((err, item) => {
      utils.itemNotFound(err, item, reject, 'NOT_FOUND')
      resolve(utils.buildSuccObject({'response':true, 'message':'Password changed successfully!'}))
    })
  })
}

/**
 * Updates a user password in database
 * @param {string} password - new password
 * @param {Object} user - user object
 */
const updatePassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.password = password
    user.save((err, item) => {
      utils.itemNotFound(err, item, reject, 'NOT_FOUND')
      resolve(item)
    })
  })
}



/**
 * Finds user by email to reset password
 * @param {string} email - user email
 */
const findUserToResetPassword = async email => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        email
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}

const findUserToResetPasswordMobile = async mobile_number => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        mobile_number:mobile_number
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}


const findUserToResetPasswordMaestro = async email => {
  return new Promise((resolve, reject) => {
    Maestro.findOne(
      {
        email
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}

const findUserToResetPasswordMobileMaestro = async mobile_number => {
  return new Promise((resolve, reject) => {
    Maestro.findOne(
      {
        mobile_number
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}

const findUserToResetPasswordOrg = async email => {
  return new Promise((resolve, reject) => {
    Organization.findOne(
      {
        email
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}

/**
 * Checks if a forgot password verification exists
 * @param {string} id - verification id
 */
const findForgotPassword = async obj => {
  return new Promise((resolve, reject) => {
	  if(obj.email){
    OTP.findOne(
      {
        email: obj.email,
		otp:obj.otp,
        used: false
      },
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'NOT_FOUND_OR_ALREADY_USED')
        resolve(item)
      }
    )
	  }
	if(obj.mobile_number){
    OTP.findOne(
      {
        mobile_number: obj.mobile_number,
		otp:obj.otp,
        used: false
      },
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'NOT_FOUND_OR_ALREADY_USED')
        resolve(item)
      }
    )
	  }

  })
}

/**
 * Creates a new password forgot
 * @param {Object} req - request object
 */
const saveForgotPassword = async req => {
  return new Promise((resolve, reject) => {
    const forgot = new ForgotPassword({
      email: req.body.email,
      verification: uuid.v4(),
      ipRequest: utils.getIP(req),
      browserRequest: utils.getBrowserInfo(req),
      countryRequest: utils.getCountry(req)
    })
    forgot.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve(item)
    })
  })
}

const createOtp = async req => {

  return new Promise((resolve, reject) => {
	  if(req.email){
    const otp = new OTP({
      email: req.email,
      otp: req.otp,
      user_id: req.user_id
    })
    otp.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve(item)
    })
	  }
	  if(req.mobile_number){
		 const otp = new OTP({
			  mobile_number: req.mobile_number,
			  otp: req.otp,
			  user_id: req.user_id
			})
			otp.save((err, item) => {
			  if (err) {
				reject(utils.buildErrObject(422, err.message))
			  }
			  resolve(item)
			})
	  }
  })
	}


/**
 * Builds an object with created forgot password object, if env is development or testing exposes the verification
 * @param {Object} item - created forgot password object
 */
const forgotPasswordResponse = item => {
  let data = {
    msg: 'RESET_EMAIL_SENT',
    email: item.email
  }
  if (process.env.NODE_ENV !== 'production') {
    data = {
      ...data,
      verification: item.verification
    }
  }
  return data
}

/**
 * Checks against user if has quested role
 * @param {Object} data - data object
 * @param {*} next - next callback
 */
const checkPermissionsMaestro = async (data, next) => {

  return new Promise((resolve, reject) => {
    Maestro.findById(data.id, (err, result) => {
      utils.itemNotFound(err, result, reject, 'NOT_FOUND')
      if (data.roles.indexOf(result.role) > -1) {
        return resolve(next())
      }
      return reject(utils.buildErrObject(401, 'UNAUTHORIZED'))
    })
  })
}
const checkPermissions = async (data, next) => {

  return new Promise((resolve, reject) => {
    Admin.findById(data.id, (err, result) => {
      utils.itemNotFound(err, result, reject, 'NOT_FOUND')
      if (data.roles.indexOf(result.role) > -1) {
        return resolve(next())
      }
      return reject(utils.buildErrObject(401, 'UNAUTHORIZED'))
    })
  })
}

/**
 * Gets user id from token
 * @param {string} token - Encrypted and encoded token
 */
const getUserIdFromToken = async token => {
  return new Promise((resolve, reject) => {
    // Decrypts, verifies and decode token
    jwt.verify(auth.decrypt(token), process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(utils.buildErrObject(409, 'BAD_TOKEN'))
      }
      resolve(decoded.data._id)
    })
  })
}

/********************
 * Public functions *
 ********************/

/**
 * Login function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.checkMobile= async (req, res) => {
	try{
		const data= matchedData(req)
		console.log(data);
		const user=await findUserPhoneExists(data.mobile_number);
		console.log(user);
		if(user){
			 res.status(200).json(user)
		}

	}catch (error) {
    utils.handleError(res, error)
  }
}


exports.checkMaestroMobile= async (req, res) => {
	try{
		const data= matchedData(req)
		console.log(data);
		const user=await findMaestroPhoneExists(data.mobile_number);
		console.log(user);
		if(user){
			 res.status(200).json(user)
		}

	}catch (error) {
    utils.handleError(res, error)
  }
}

exports.checkMaestroEmail= async (req, res) => {
	try{
		const data= matchedData(req)
		console.log(data);
		const user=await findMaestroEmailExists(data.email);
		console.log(user);
		if(user){
			 res.status(200).json(user)
		}

	}catch (error) {
    utils.handleError(res, error)
  }
}

exports.checkEmail= async (req, res) => {
	try{
		const data= matchedData(req)
		console.log(data);
		const user=await findUserEmailExists(data.email);
		console.log(user);
		if(user){
			 res.status(200).json(user)
		}

	}catch (error) {
    utils.handleError(res, error)
  }
}
exports.login = async (req, res) => {
  try {
    const data = matchedData(req)
	console.log(data);

    const user =  data.email ? await findUser(data.email) : await findUserByPhone(data.mobile_number)
	console.log('User found', user);
    //await userIsBlocked(user)
	await userIsVerified(user)
    await checkLoginAttemptsAndBlockExpires(user)
    const isPasswordMatch = await auth.checkPassword(data.password, user)
    if (!isPasswordMatch) {
      utils.handleError(res, await passwordsDoNotMatch(user))
    } else {
      // all ok, register access and return token
      user.loginAttempts = 0
      await saveLoginAttemptsToDB(user)
      res.status(200).json(await saveUserAccessAndReturnToken(req, user))
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.maestroLogin = async (req, res) => {
  try {
    const data = matchedData(req)
	console.log(data);

    const user =  data.email ? await findMaestro(data.email) : await findMaestroByPhone(data.mobile_number)
	console.log('User found', user);
    //await userIsBlocked(user)
	//await userIsVerified(user)
   // await checkLoginAttemptsAndBlockExpires(user)
    const isPasswordMatch = await auth.checkPassword(data.password, user)
    if (!isPasswordMatch) {
      utils.handleError(res, await passwordsDoNotMatch(user))
    } else {
      // all ok, register access and return token
      //user.loginAttempts = 0
      //await saveLoginAttemptsToDB(user)
      res.status(200).json(await saveUserAccessAndReturnToken(req, user))
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Register function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.register = async (req, res) => {
  try {
    // Gets locale from header 'Accept-Language'
    const locale = req.getLocale()
    req = matchedData(req)
    const doesEmailExists = await emailer.emailExists(req.email)
    if (!doesEmailExists) {
      const item = await registerUser(req)
      const userInfo = setUserInfo(item)
      const response = returnRegisterToken(item, userInfo)
      emailer.sendRegistrationEmail(locale, item)
      res.status(201).json(response)
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.maestroSignup = async (req, res) => {
  try {
	  console.log(req.files);
    // Gets locale from header 'Accept-Language'
    const locale = req.getLocale()

      const item = await db.createMaestro(Maestro,req.body, req.files)
	  console.log('created ', item);
	  if(item.response==false){
		   res.status(201).json(item)
	  }else{
      const userInfo = setMaestroUserInfo(item)
      const response = returnMaestroRegisterToken(item, userInfo)
	   res.status(201).json(response)
	  }
     //emailer.sendMaestroRegistrationEmail(locale, item)


  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * create content management function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.contentManagement = async (req, res) => {
  try {
    // Gets locale from header 'Accept-Language'
    const locale = req.getLocale()
    req = matchedData(req)
      const item = await createContentManagement(req)
      res.status(201).json(item)

  } catch (error) {
    utils.handleError(res, error)
  }
}
/**
 * Verify function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.verify = async (req, res) => {
  try {
    req = matchedData(req)
    const user = await verificationExists(req.id)
    res.status(200).json(await verifyUser(user))
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.forgotPasswordOtp = async (req,res) => {
    try {
		req = matchedData(req)
		if(req.email){
		const user = await findUser(req.email)
		if(user){
			var otp = Math.floor((Math.random() * 9999) + 1);
            if(otp < 1000 ){
                otp = otp + 1000;
            }
			var otpData={email:req.email, otp:otp};
			var otp_data= await createOtp(otpData);
			emailer.sendForgotEmail({
                name : user.first_name,
                email : user.email,
                id : user._id,
                otp : otp,
                template_name : "forgot_password",
            })
			res.status(200).json(otp_data);
		}else{
			res.status(404).json({'message':'user not found', 'response':false});
		}
		}
		if(req.mobile_number){
		const user = await findUserByPhone(req.mobile_number)
		if(user){
			var otp = Math.floor((Math.random() * 9999) + 1);
            if(otp < 1000 ){
                otp = otp + 1000;
            }
			var otpData={mobile_number:req.mobile_number, otp:otp};
			var otp_data= await createOtp(otpData);
			emailer.sendForgotEmail({
                name : user.first_name,
                email : user.email,
                id : user._id,
                otp : otp,
                template_name : "forgot_password",
            })
			res.status(200).json(otp_data);
		}else{
			res.status(404).json({'message':'user not found', 'response':false});
		}
		}
		} catch (error) {
		utils.handleError(res, error)
	  }

}


/* exports.forgotPasswordOtpMaestro = async (req,res) => {
    try {
		req = matchedData(req)
		const user = await findMaestro(req.email)
		if(user){
			var otp = Math.floor((Math.random() * 9999) + 1);
            if(otp < 1000 ){
                otp = otp + 1000;
            }


		var otpData={email:req.email, otp:otp};
		var otp_data= await createOtp(otpData);
		emailer.sendForgotEmail({
                name : user.first_name,
                email : user.email,
                id : user._id,
                otp : otp,
                template_name : "forgot_password",
            })
		res.status(200).json(otp_data);
		}else{
		res.status(404).json({'message':'user not found', 'response':false});
		}
	  } catch (error) {
		utils.handleError(res, error)
	  }
} */

exports.forgotPasswordOtpMaestro = async (req,res) => {
    try {
		req = matchedData(req)
		if(req.email){
		const user = await findMaestro(req.email)
		if(user){
			var otp = Math.floor((Math.random() * 9999) + 1);
            if(otp < 1000 ){
                otp = otp + 1000;
            }
			var otpData={email:req.email, otp:otp};
			var otp_data= await createOtp(otpData);
			emailer.sendForgotEmail({
                name : user.first_name,
                email : user.email,
                id : user._id,
                otp : otp,
                template_name : "forgot_password",
            })
			res.status(200).json(otp_data);
		}else{
			res.status(404).json({'message':'user not found', 'response':false});
		}
		}
		if(req.mobile_number){
		const user = await findMaestroByPhone(req.mobile_number)
		if(user){
			var otp = Math.floor((Math.random() * 9999) + 1);
            if(otp < 1000 ){
                otp = otp + 1000;
            }
			var otpData={mobile_number:req.mobile_number, otp:otp};
			var otp_data= await createOtp(otpData);
			emailer.sendForgotEmail({
                name : user.first_name,
                email : user.email,
                id : user._id,
                otp : otp,
                template_name : "forgot_password",
            })
			res.status(200).json(otp_data);
		}else{
			res.status(404).json({'message':'user not found', 'response':false});
		}
		}
		} catch (error) {
		utils.handleError(res, error)
	  }

}


exports.forgotPasswordOtpOrganization = async (req,res) => {
    try {
		req = matchedData(req)
		const user = await findOrg(req.email)
		if(user){
			var otp = Math.floor((Math.random() * 9999) + 1);
            if(otp < 1000 ){
                otp = otp + 1000;
            }


		var otpData={email:req.email, otp:otp};
		var otp_data= await createOtp(otpData);
		emailer.sendForgotEmail({
                name : user.organization_name,
                email : user.email,
                id : user._id,
                otp : otp,
                template_name : "forgot_password",
            })
		res.status(200).json(otp_data);
		}else{
		res.status(404).json({'message':'user not found', 'response':false});
		}
	  } catch (error) {
		utils.handleError(res, error)
	  }
}


exports.verifyEmail = async (req,res) => {

    jwt.verify(req.params.token, process.env.JWT_SECRET, function(err, decoded) {
      if (err) {
        console.log(err);
        res.status(422).send("<h1> Token has been expired or invalid </h1>")
        //utils.handleError(res, err)
      }else{
        console.log(decoded);
		User.updateOne({_id: decoded.data}, {
			verified: true,
		}, function(err, affected, resp) {

			   res.status(201).send("<h1> Email Verified Successfully </h1>")

		}).catch(err => {
            console.log(err);
            res.status(201).send("<h1 style='color:red'> Something Went Wrong </h1>")

        })

      }
    });


}


/**
 * Forgot password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.forgotPassword = async (req, res) => {
  try {
    // Gets locale from header 'Accept-Language'
    const locale = req.getLocale()
    const data = matchedData(req)
    await findUser(data.email)
    const item = await saveForgotPassword(req)
    emailer.sendResetPasswordEmailMessage(locale, item)
    res.status(200).json(forgotPasswordResponse(item))
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Reset password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.resetPassword = async (req, res) => {
	console.log('request received:', req);
  try {
	  if(req.body.email){
    const data = matchedData(req)
    const forgotPassword = await findForgotPassword(data)
    const user = await findUserToResetPassword(forgotPassword.email)
    await updatePassword(data.password, user)
    const result = await markResetPasswordAsUsed(req, forgotPassword)
    res.status(200).json(result)
	  }
	  if(req.body.mobile_number){
	const data = matchedData(req)
	const forgotPassword = await findForgotPassword(data)
	const user = await findUserToResetPasswordMobile(forgotPassword.mobile_number)
	console.log('user found:', user);
	await updatePassword(data.password, user)
	const result = await markResetPasswordAsUsed(req, forgotPassword)
	res.status(200).json(result)
	  }
  } catch (error) {
    utils.handleError(res, error)
  }
}

/* exports.resetPasswordMaestro = async (req, res) => {
  try {
    const data = matchedData(req)
    const forgotPassword = await findForgotPassword(data)
    const user = await findUserToResetPasswordMaestro(forgotPassword.email)
    await updatePassword(data.password, user)
    const result = await markResetPasswordAsUsed(req, forgotPassword)
    res.status(200).json(result)
  } catch (error) {
    utils.handleError(res, error)
  }
} */

exports.resetPasswordMaestro = async (req, res) => {
	console.log('request received:', req);
  try {
	  if(req.body.email){
    const data = matchedData(req)
    const forgotPassword = await findForgotPassword(data)
    const user = await findUserToResetPasswordMaestro(forgotPassword.email)
    await updatePassword(data.password, user)
    const result = await markResetPasswordAsUsed(req, forgotPassword)
    res.status(200).json(result)
	  }
	  if(req.body.mobile_number){
	const data = matchedData(req)
	const forgotPassword = await findForgotPassword(data)
	const user = await findUserToResetPasswordMobileMaestro(forgotPassword.mobile_number)
	console.log('user found:', user);
	await updatePassword(data.password, user)
	const result = await markResetPasswordAsUsed(req, forgotPassword)
	res.status(200).json(result)
	  }
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.resetPasswordOrg = async (req, res) => {
  try {
    const data = matchedData(req)
    const forgotPassword = await findForgotPassword(data)
    const user = await findUserToResetPasswordOrg(forgotPassword.email)
    await updatePassword(data.password, user)
    const result = await markResetPasswordAsUsed(req, forgotPassword)
    res.status(200).json(result)
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Refresh token function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getRefreshToken = async (req, res) => {
  try {
    const tokenEncrypted = req.headers.authorization
      .replace('Bearer ', '')
      .trim()
    let userId = await getUserIdFromToken(tokenEncrypted)
    userId = await utils.isIDGood(userId)
    const user = await findUserById(userId)
    const token = await saveUserAccessAndReturnToken(req, user)
    // Removes user info from response
    delete token.user
    res.status(200).json(token)
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Roles authorization function called by route
 * @param {Array} roles - roles specified on the route
 */
exports.roleAuthorization = roles => async (req, res, next) => {
  try {
    // console.log('req===========',req)
    const data = {
      id: req.user._id,
      roles
    }
    await checkPermissions(data, next)
  } catch (error) {
    utils.handleError(res, error)
  }
}



/**
 * Roles authorization organization function called by route
 * @param {Array} roles - roles specified on the route
 */
exports.roleAuthorizationOrganization = roles => async (req, res, next) => {
  try {
    console.log(req.user)
    const data = {
      id: req.user._id,
      roles
    }
    await checkPermissionsOrganization(data, next)
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.roleAuthorizationMaestro = roles => async (req, res, next) => {
  try {
    const data = {
      id: req.user._id,
      roles
    }
    await checkPermissionsMaestro(data, next)
  } catch (error) {
    utils.handleError(res, error)
  }
}



/**
 * Checks against user if has quested role
 * @param {Object} data - data object
 * @param {*} next - next callback
 */
const checkPermissionsOrganization = async (data, next) => {

  return new Promise((resolve, reject) => {
    console.log(data)
    Organization.findById(data.id, (err, result) => {
      utils.itemNotFound(err, result, reject, 'NOT_FOUND')
      if (data.roles.indexOf(result.role) > -1) {
        return resolve(next())
      }
      return reject(utils.buildErrObject(401, 'UNAUTHORIZED'))
    })
  })
}


/**
 * Get all items function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getAllContentData = async (req, res) => {
  try {
    const query = await db.checkQueryString(req.query)
    res.status(200).json(await db.getItems(req, ContentManagemnt, query))
  } catch (error) {
    utils.handleError(res, error)
  }
}


/**
 * Get single item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getContentData = async (req, res) => {
  try {
    req = matchedData(req)
    const id = await utils.isIDGood(req.id)
    res.status(200).json(await db.getItem(id, model))
  } catch (error) {
    utils.handleError(res, error)
  }
}


/**
 * Roles authorization organization function called by route
 * @param {Array} roles - roles specified on the route
 */
exports.roleAuthorizationAdmin = roles => async (req, res, next) => {
  try {
    console.log('check user===========================',req.user)
    const data = {
      id: req.user._id,
      roles
    }
    await checkPermissionsAdmin(data, next)
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Checks against user if has quested role
 * @param {Object} data - data object
 * @param {*} next - next callback
 */
const checkPermissionsAdmin = async (data, next) => {

  return new Promise((resolve, reject) => {
    // console.log(data)
    Admin.findById(data.id, (err, result) => {
      utils.itemNotFound(err, result, reject, 'NOT_FOUND')
      if (data.roles.indexOf(result.role) > -1) {
        return resolve(next())
      }
      return reject(utils.buildErrObject(401, 'UNAUTHORIZED'))
    })
  })
}
