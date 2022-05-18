const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const SubscriptionSchema = new mongoose.Schema(
  {
    duration: {
      type: String,
    },
    price: {
      type: Number,
    },
    storage: {
      type: Number,
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: [true, false],
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },

  },
  {
    timestamps: true,
    toJSON: {virtuals:true}
  }
)


SubscriptionSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('SubscriptionSchema', SubscriptionSchema)
