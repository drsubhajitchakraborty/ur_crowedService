const nodemailer = require('nodemailer')
const mg = require('nodemailer-mailgun-transport')
const i18n = require('i18n')
const User = require('../models/user')
const Organization = require('../models/admin.model')
const { itemAlreadyExists } = require('../middleware/utils')
const express = require('express')
var jwt = require('jsonwebtoken');
var path = require('path')
const app = express()
var jade = require('jade')
app.set('views')
app.set('view engine', 'jade');
const __link = "https://13.235.184.126:5003/"
const __link_org = "https://13.235.184.126:5004/"
// const __dir = "https://13.235.184.126/HablaNowApis/"
const __dir = "https://nodeserver.mydevfactory.com/jajakul/CrowedAdmin/"

const logo_url = "https://nodeserver.mydevfactory.com:3303/logo.png"
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
var mailer = require('express-mailer');
mailer.extend(app, {
  from: 'backend.brainium@gmail.com',//promatics.tajinder@gmail.com//mahamandapam@gmail.com
  host: 'smtp.gmail.com', // hostname
  secureConnection: true, // use SSL
  port: 465, // port for secure SMTP
  transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
  auth: {
    user: 'backend.brainium@gmail.com',
    pass: 'Gagz@123'//protjmsingh//maha@321
  }
});

/**
 * Sends email
 * @param {Object} data - data
 * @param {boolean} callback - callback
 */
const sendEmail = async (data, callback) => {
	console.log('inside send mail');
  const auth = {
    auth: {
      // eslint-disable-next-line camelcase
      api_key: process.env.EMAIL_SMTP_API_MAILGUN,
      domain: process.env.EMAIL_SMTP_DOMAIN_MAILGUN
    }
  }
  const transporter = nodemailer.createTransport(mg(auth))
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: `${data.user.name} <${data.user.email}>`,
    subject: data.subject,
    html: data.htmlMessage
  }
  transporter.sendMail(mailOptions, err => {
    if (err) {
		console.log(err);
      return callback(false)
    }
    return callback(true)
  })
}

/**
 * Prepares to send email
 * @param {string} user - user object
 * @param {string} subject - subject
 * @param {string} htmlMessage - html message
 */
const prepareToSendEmail = (user, subject, htmlMessage) => {
  user = {
    name: user.first_name,
    email: user.email,
    verification: user.verification
  }
  const data = {
    user,
    subject,
    htmlMessage
  }
  if (process.env.NODE_ENV === 'production') {
    sendEmail(data, messageSent =>
      messageSent
        ? console.log(`Email SENT to: ${user.email}`)
        : console.log(`Email FAILED to: ${user.email}`)
    )
  } else if (process.env.NODE_ENV === 'development') {
    console.log(data)
  }
}

module.exports = {
  /**
   * Checks User model if user with an specific email exists
   * @param {string} email - user email
   */
  async emailExists(email,model) {
    return new Promise((resolve, reject) => {
      model.findOne(
        {
            email : email

        }
      ).then(item => {
        var err = null;
        itemAlreadyExists(err, item, reject, 'EMAIL ALREADY EXISTS')
        resolve(false)

      }).catch(err => {
        var item = null;
        itemAlreadyExists(err, item, reject, 'ERROR')
        resolve(false)
      })
    })
  },
  async orgExists(email){
	  return new Promise((resolve, reject) => {
      Organization.findOne(
        {
            email : email
        }
      ).then(item => {
        var err = null;
        itemAlreadyExists(err, item, reject, 'EMAIL_ALREADY_EXISTS')
        resolve(false)

      }).catch(err => {
        var item = null;
        itemAlreadyExists(err, item, reject, 'ERROR')
        resolve(false)
      })
    })
  },
  /**
   * Checks User model if user with an specific email exists but excluding user id
   * @param {string} id - user id
   * @param {string} email - user email
   */
  async emailExistsExcludingMyself(id, email) {
    return new Promise((resolve, reject) => {
      User.findOne(
        {
          email,
          _id: {
            $ne: id
          }
        },
        (err, item) => {
          itemAlreadyExists(err, item, reject, 'EMAIL_ALREADY_EXISTS')
          resolve(false)
        }
      )
    })
  },

  /**
   * Sends registration email
   * @param {string} locale - locale
   * @param {Object} user - user object
   */
  async sendRegistrationEmailMessage(locale, user) {
	//console.log(user);
    i18n.setLocale(locale)
    const subject = i18n.__('registration.SUBJECT')
    const htmlMessage = i18n.__(
      'registration.MESSAGE',
      user.first_name,
      process.env.FRONTEND_URL,
      user.verification
    )
	console.log(htmlMessage);
    prepareToSendEmail(user, subject, htmlMessage)
  },

  async sendRegistrationEmail(locale, user) {
        console.log('sending registration email:');
		console.log(user)
        var tokens = jwt.sign({
             data: user._id
        }, process.env.JWT_SECRET, { expiresIn: '24h' });

		var name=user.first_name ? user.first_name : user.organization_name;
        var mailOptions = {
            to: user.email,
            subject: 'Hi! '+capitalizeFirstLetter(name),
            user: {
                name : capitalizeFirstLetter(name),
                link : __link+"verify/email/"+tokens
            }

        }

        console.log(user);
        app.mailer.send('verify_email', mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },
    async sendRegistrationEmailToOrganization(locale, org) {
        console.log('sending registration email:');
		console.log(org)
        var tokens = jwt.sign({
             data: org._id
        }, process.env.JWT_SECRET, { expiresIn: '24h' });

        var mailOptions = {
            to: org.email,
            subject: 'Hi! '+capitalizeFirstLetter(org.organization_name),
            user: {
                name : org.organization_name,
                link : __link_org+"verify_org/email/"+tokens,
				otp:org.otp
            }

        }

        console.log(org);
        app.mailer.send('verify_org_email', mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },

  async sendForgotEmail(object) {

        var tokens = jwt.sign({
             data: object.id
        }, process.env.JWT_SECRET, { expiresIn: '24h' });

        var mailOptions = {
            to: object.email,
            subject: 'Forgot Password',
            user: {
                name : object.name,
                link : __dir+"views/forgot_password.php?token="+tokens,
                otp : object.otp
            }

        }

        // console.log(user);
        app.mailer.send(object.template_name, mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },

  async sendForgotEmailAdmin(object) {

    var mailOptions = {
      from:'Taco Menus',
      to: object.admin.email,
      subject: 'Forgot Password',
      user: {
          name : object.admin.name,
          link : __dir+"#/reset-password?token="+object.token,
      }
  }
  // console.log(user);
  app.mailer.send(object.template_name, mailOptions, function (err, message) {
      if (err) {
          console.log('There was an error sending the email'+err)
      }else{
          console.log("Mail sent to user");
      }
  })
  },

  async sendForgotEmailFortend(object) {

    var mailOptions = {
      to: object.email,
      subject: 'Forgot Password',
      user: {
          name : object.name,
          email : object.email,
          password : object.password,
      }
  }
  // console.log(user);
  app.mailer.send(object.template_name, mailOptions, function (err, message) {
      if (err) {
          console.log('There was an error sending the email'+err)
      }else{
          console.log("Mail sent to user");
      }
  })
  },

  async sendCredentialsEmail(object) {

        var tokens = jwt.sign({
             data: object.id
        }, process.env.JWT_SECRET, { expiresIn: '24h' });

        var mailOptions = {
            to: object.email,
            subject: 'Registration with Hablow',
            user: {
                name : object.name,
                password : object.password,
            }

        }

        // console.log(user);
        app.mailer.send(object.template_name, mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },
  async sendCredentialsEmailSubAdmin(object) {

        var tokens = jwt.sign({
             data: object.id
        }, process.env.JWT_SECRET, { expiresIn: '24h' });

        var mailOptions = {
            to: object.email,
            subject: 'Registration with Hablow',
            user: {
                name : object.email,
                password : object.password,
            }

        }

        // console.log(user);
        app.mailer.send(object.template_name, mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },



  async adminExists(email,modal) {
    return new Promise((resolve, reject) => {
        modal.findOne(
      {
          email : email
      }
    ).then(item => {
      var err = null;
      itemAlreadyExists(err, item, reject, 'EMAIL ALREADY EXISTS')
      resolve(false)

    }).catch(err => {
      var item = null;
      itemAlreadyExists(err, item, reject, 'ERROR')
      resolve(false)
    })
  })
},
  /**
   * Sends reset password email
   * @param {string} locale - locale
   * @param {Object} user - user object
   */
  async sendResetPasswordEmailMessage(locale, user) {
    i18n.setLocale(locale)
    const subject = i18n.__('forgotPassword.SUBJECT')
    const htmlMessage = i18n.__(
      'forgotPassword.MESSAGE',
      user.email,
      process.env.FRONTEND_URL,
      user.verification
    )
    prepareToSendEmail(user, subject, htmlMessage)
  },


  async sendContactUsEmailToUser(object) {

    var mailOptions = {
      from:'Taco Menus',
      to: object.data.email,
      subject: object.data.subject,
      emailData: {
          name : object.data.name,
          message : object.data.message,
          replyMessage : object.data.replyMessage,
      }
  }
  // console.log(user);
  app.mailer.send(object.template_name, mailOptions, function (err, message) {
      if (err) {
          console.log('There was an error sending the email'+err)
      }else{
          console.log("Mail sent to user");
      }
  })
  },

    async userRegistrationEmailToAdmin(object) {


        var mailOptions = {
            to: object.admin.email,
            subject: 'Registration with Gigz-Econ',
            user: {
                name : capitalizeFirstLetter(object.name),
                email : object.email
            }

        }

        // console.log(user);
        app.mailer.send(object.template_name, mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },
  async userRegistrationOTP(object) {


        var mailOptions = {
            to: object.email,
            subject: 'Registration with MyInspectConnect',
            user: {
                name : capitalizeFirstLetter(object.name),
                logo_url : logo_url,
                otp : object.otp,

            }

        }

        // console.log(user);
        app.mailer.send(object.template_name, mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },
  async userForgotPasswordOTP(object) {


        var mailOptions = {
            to: object.email,
            subject: 'Forgot Password OTP',
            user: {
                name : capitalizeFirstLetter(object.name),
                logo_url : logo_url,
                otp : object.otp,

            }

        }

        // console.log(user);
        app.mailer.send(object.template_name, mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },
  async userRegistrationEmail(object) {


        var mailOptions = {
            to: object.email,
            subject: 'Registration with MyInspectConnect',
            user: {
                name : capitalizeFirstLetter(object.name),
                logo_url : logo_url,

            }

        }

        // console.log(user);
        app.mailer.send(object.template_name, mailOptions, function (err, message) {
            if (err) {
                console.log('There was an error sending the email'+err)
            }else{
                console.log("Mail sent to user");
            }
        })


  },

}
