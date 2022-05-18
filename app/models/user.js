const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      validate: {
        validator: validator.isEmail,
        message: 'EMAIL_IS_NOT_VALID'
      },
      lowercase: true,
      unique: true,
      required: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    dob: {
      type: String,
    },
    interest: {
      type: Array,
    },
    hobbiest: {
      type: Array,
    },
    dislicks: {
      type: Array,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    status: {
      type: String,
      enum: [true, false],
      default: false
    },
    isActive: { type: Boolean, default: false },
    gender: {
      type: String,
      enum: ['Male', 'Female','Other']
    },
    verification: {
      type: String
    },
    otp: {
      type: Number
    },
    verified: {
      type: Boolean,
      default: false
    },
    device_token: {
      type: String,
      default: null
    },
    phone: {
      type: String
    },
    lat: {
      type: String
    },
    lng: {
      type: String
    },
    profileImage: {
      type: String
    },
    license_doc: {
      type: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point'] 
        },
        coordinates: {
            type: [Number]
        }
    },
    address: {
      type: String
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    blockExpires: {
      type: Date,
      default: Date.now,
      select: false
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

const hash = (user, salt, next) => {
  bcrypt.hash(user.password, salt, (error, newHash) => {
    if (error) {
      return next(error)
    }
    user.password = newHash
    return next()
  })
}

const genSalt = (user, SALT_FACTOR, next) => {
  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) {
      return next(err)
    }
    return hash(user, salt, next)
  })
}

UserSchema.pre('save', function(next) {
  const that = this
  const SALT_FACTOR = 5
  if (!that.isModified('password')) {
    return next()
  }
  return genSalt(that, SALT_FACTOR, next)
})

UserSchema.methods.comparePassword = function(passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  )
}
UserSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('User', UserSchema)
