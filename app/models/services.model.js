const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const ServiceSchema = new mongoose.Schema(
  {
    header: {
      type: String,
    },
    description: {
      type: String,
    },
    icon: {
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


ServiceSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('Service', ServiceSchema)
