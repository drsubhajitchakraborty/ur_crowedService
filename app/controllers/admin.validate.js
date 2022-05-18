const { validationResult } = require('../middleware/utils')
const validator = require('validator')
const { check } = require('express-validator')

/**
 * Validates create new item request
 */

exports.validateOrganization = [
  check('organization name')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  check('email')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isEmail()
    .withMessage('EMAIL IS NOT VALID'),
   check('password')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isLength({
      min: 8
    })
    .withMessage('PASSWORD TOO SHORT MIN 8'),
	check('phone')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
	.isLength({
      min: 10
    })
    .withMessage('PHONE NUMBER TOO SHORT MIN 10'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]
exports.validateLogin = [
 check('email')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isEmail()
    .withMessage('EMAIL IS NOT VALID'),
  check('password')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isLength({
      min: 5
    })
    .withMessage('PASSWORD TOO SHORT MIN 5'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]
exports.validateOtp =[
	check('phone')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
	.isLength({
      min: 10
    })
    .withMessage('PHONE NUMBER TOO SHORT MIN 10'),
	check('otp')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
	.isLength({
      min: 4
    })
    .withMessage('OTP TOO SHORT MIN 4'),

]
exports.changePassword=[
	check('oldpassword')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
	.trim(),
	check('password')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isLength({
      min: 5
    })
    .withMessage('PASSWORD TOO SHORT MIN 5')
	.trim(),
	(req, res, next) => {
    validationResult(req, res, next)
	}
	]


/**
 * Validates add category request
 */
exports.addCategory = [
  check('categoryName')
    .exists()
    .withMessage('CATEGORY NAME IS MISSING')
    .not()
    .isEmpty()
    .withMessage('CATEGORY NAME IS EMPTY'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]

/**
 * Validates get item request
 */
exports.getContentData = [
  check('id')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]


/**
 * Validates content Management request
 */
exports.contentManagement = [
  check('content')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
	check('content type')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]


/**
 * Validates topic list   request
 */
exports.CreateTopicList = [
  check('topic name')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
	check('topic type')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]

exports.validateAdmin = [
  check('name')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  check('email')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isEmail()
    .withMessage('EMAIL IS NOT VALID'),
   check('password')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isLength({
      min: 8
    })
    .withMessage('PASSWORD TOO SHORT MIN 8'),
	check('phone')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
	.isLength({
      min: 7
    })
    .withMessage('PHONE NUMBER TOO SHORT MIN 10'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]


/**
 * Validates content Management request
 */
exports.subscriptionManagement = [
  check('plan name')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
	check('description')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  check('unit rate')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  check('meastro earns')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  check('left over')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]

exports.userRegistration = [
  check('first name')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
	check('last name')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY'),
	 check('mobile number')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .trim(),
	check('email')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isEmail()
    .withMessage('EMAIL IS NOT VALID'),
     check('password')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS EMPTY')
    .isLength({
      min: 5
    })
    .withMessage('PASSWORD TOO SHORT MIN 5'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]
