const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const AdminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            // required: true
        },
        email: {
            type: String,
            validate: {
                validator: validator.isEmail,
                message: 'EMAIL_IS_NOT_VALID'
            },
            lowercase: true,
            unique: true,
            // required: true
        },

        phone: {
            type: String
        },
        password: {
            type: String,
            // required: true,
            select: false
        },
        decoded_password: {
            type: String,
        },
        profile_image: {
            type: String,
        },
        role: {
            type: String,
            enum: ['admin','subadmin'],
            default: 'admin'
        },
        verification: {
            type: String
        },
        verified: {
            type: Boolean,
            default: false
        },
        reset_pass_verified: {
            type: Boolean,
            default: false
        },
        permission: {
            type: Array
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

AdminSchema.pre('save', function(next) {
    const that = this
    const SALT_FACTOR = 5
    if (!that.isModified('password')) {
        return next()
    }
    return genSalt(that, SALT_FACTOR, next)
})

AdminSchema.methods.comparePassword = function(passwordAttempt, cb) {
    bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
        err ? cb(err) : cb(null, isMatch)
    )
}
AdminSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('Admin', AdminSchema)
