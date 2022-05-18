const passport = require('passport')
const Admin = require('../app/models/admin.model')
const UserSchema = require('../app/models/user')
// const RestaurantSchema = require('../app/models/restaurant.model')

const auth = require('../app/middleware/admin.auth')
const JwtStrategy = require('passport-jwt').Strategy

/**
 * Extracts token from: header, body or query
 * @param {Object} req - request object
 * @returns {string} token - decrypted token
 */
const jwtExtractor = req => {
  // console.log('jwt=========================',req.headers)
  let token = null
  if (req.headers.authorization) {
    token = req.headers.authorization.replace('Bearer ', '').trim()
  } else if (req.body.token) {
    token = req.body.token.trim()
  } else if (req.query.token) {
    token = req.query.token.trim()
  }
  if (token) {
    // Decrypts token
    // console.log('token==================================================',token)
    token = auth.decrypt(token)
    // console.log('token',token)
  }
  return token
}

/**
 * Options object for jwt middlware
 */
const jwtOptions = {
  jwtFromRequest: jwtExtractor,
  secretOrKey: process.env.JWT_SECRET
}

/**
 * Login with JWT middleware
 */
const jwtLogin = new JwtStrategy(jwtOptions, (payload, done) => {
  console.log('payload==========================', payload)
  Admin.findById(payload.data._id, (err, admin) => {
    console.log(err)

    if (err) {
      return done(err, false)
    }
    if (admin){

      return !admin ? done(null, false) : done(null, admin)
    }else {
      UserSchema.findById(payload.data._id, (err, user) => {
        console.log(err)

        if (err) {
          return done(err, false)
        }
        return !user ? done(null, false) : done(null, user)
      })
    }
  })
})

passport.use(jwtLogin)
