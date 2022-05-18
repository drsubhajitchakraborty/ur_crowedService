const controller = require('../controllers/admin.controller')
const validate = require('../controllers/admin.validate')
const AuthController = require('../controllers/admin.auth.controller')
const express = require('express')
const router = express.Router()
require('../../config/passport-admin')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})
const trimRequest = require('trim-request')

/*
 * Admin routes
 */

router.post(
  '/admin_registration',
  trimRequest.all,
  // validate.validateAdmin,
  controller.createAdminUser
)

router.post(
  '/admin_login',
  trimRequest.all,
  validate.validateLogin,
  controller.AdminLogin
)

router.get(
  '/get_admin_detail',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.validateToken,
  controller.AdminDetails
)

router.post(
  '/edit_admin_detail',
  trimRequest.all,
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  controller.editAdminDetails
)

router.post(
  '/change_admin_password',
  trimRequest.all,
  validate.changePassword,
  controller.changePassword
)

router.post(
  '/admin-forgot-password',
  trimRequest.all,
  // validate.forgotPassword,
  controller.forgotPassword
)

router.post(
  '/admin-reset-password',
  trimRequest.all,
  // validate.resetPassword,
  controller.resetPassword
)


/*
 * content management route
 */

router.post(
  '/create-content',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.createContent
)
/*
 * content management route
 */

router.post(
  '/save-update-content',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.saveContent
)

/*
 * Get all content management data with id route getAllContentData
 */
router.get(
  '/get-allcontent',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.getAllContentData
)


router.post(
  '/add-faq',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.addCategory,
  controller.addFAQ
)

router.post(
  '/get-faq-list',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.getFAQList
)

router.post(
  '/edit-faq',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.addCategory,
  controller.editFAQ
)
router.post(
  '/delete-faq',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteFAQ
)

router.post(
  '/delete-multiple-faq',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteMultipleFAQ
)

router.post(
  '/add-contact-us',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.addCategory,
  controller.addContactUs
)

router.post(
  '/get-contactus-list',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.getContactUsList
)

router.post(
  '/delete-contact-us',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteContactUs
)

router.post(
  '/delete-multiple-contactus',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteMultipleContactUs
)

router.post(
  '/contactUs-reply',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.replyOnContactUs
)



router.post(
  '/add-promo-code',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.addUser,
  controller.addPromoCode
)

router.post(
  '/edit-promo-code',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.editUser,
  controller.editPromoCode
)

router.post(
  '/get-promo-code-list',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.getPromoCodeList
)


router.post(
  '/delete-promo-code',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deletePromoCode
)

router.post(
  '/delete-multiple-promo-code',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteMultiplePromoCode
)

router.get(
  '/get-dashboard-card',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.GetDashboardCardData
)



router.post(
  '/add-CMS',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.addUser,
  controller.addCMS
)

router.post(
  '/get-CMS-list',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.getCMSList
)

router.post(
  '/edit-CMS',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.editCMS
)

router.post(
  '/delete-CMS',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteCMS
)




router.post(
  '/add-subscription',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.addUser,
  controller.addSubscription
)

router.post(
  '/get-subscription-list',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.getSubscriptionList
)

router.post(
  '/edit-subscription',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.editSubscription
)

router.post(
  '/delete-subscription',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteSubscription
)



/***************************
 *  Common routers         *
 ***************************/

router.post(
  '/status-active-inactive',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.StatusActiveInactive
)

/***************************
 * End Common routers      *
 ***************************/


/***************************
 *  Realtors routers       *
 ***************************/
router.post(
  '/register_user',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterUser,
  controller.RegisterUser
)

router.post(
  '/edit_user',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterUser,
  controller.EditUser
)

router.post(
  '/get_user_list',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterUser,
  controller.GetUserList
)

router.post(
  '/delete-user',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.DeleteUser
)

router.post(
  '/delete-multiple-user',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteMultipleUser
)

/***************************
 * End User routers     *
 ***************************/

/***************************
 *  Event routers         *
 ***************************/
router.post(
  '/add_event',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterHomeInspectors,
  controller.AddEvent
)

router.post(
  '/edit_event',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterHomeInspectors,
  controller.EditEvent
)

router.post(
  '/get_event_list',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterHomeInspectors,
  controller.GetEventList
)

router.post(
  '/delete-event',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.DeleteEvent
)

router.post(
  '/delete-multiple-event',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteMultipleEvent
)

/***************************
 * End Events routers      *
 ***************************/


/***************************
 *  Room routers         *
 ***************************/
router.post(
  '/add_room',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterHomeInspectors,
  controller.AddRoom
)

router.post(
  '/edit_room',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterHomeInspectors,
  controller.EditRoom
)

router.post(
  '/get_room_list',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.RegisterHomeInspectors,
  controller.GetRoomList
)

router.post(
  '/delete-room',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.DeleteRoom
)

router.post(
  '/delete-multiple-room',
  requireAuth,
  AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.deleteUser,
  controller.deleteMultipleRoom
)

/***************************
 * End Rooms routers      *
 ***************************/


module.exports = router
