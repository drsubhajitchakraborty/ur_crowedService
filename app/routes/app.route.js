const controller = require('../controllers/app.controller')
const validate = require('../controllers/app.auth.validate')
const AuthController = require('../controllers/auth')
// const verify = require('../controllers/forgototp.validate')
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})
const trimRequest = require('trim-request')

router.post(
  '/registration',
  trimRequest.all,
  controller.register
)

router.post(
  '/login',
  trimRequest.all,
  validate.validateLogin,
  controller.UserLogin
)

router.get(
  '/get_user_detail',
  requireAuth,
  AuthController.roleAuthorization(['user']),
  trimRequest.all,
  // validate.validateToken,
  controller.userDetails
)



router.post(
  '/forgotPassword',
  trimRequest.all,
  // validate.forgotPassword,
  controller.forgotPassword
)

router.post(
  '/resendOtp',
  trimRequest.all,
  // validate.forgotPassword,
  controller.ResendOTP
)

router.post(
  '/resetPassword',
  trimRequest.all,
  // validate.forgotPassword,
  controller.ResetPassword
)


router.post(
  '/edit-profile',
  requireAuth,
  AuthController.roleAuthorization(['user']),
  trimRequest.all,
  controller.editUser
)

module.exports = router
