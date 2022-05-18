const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const EventManageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    location: {
      type: String,
    },
    description: {
      type: String,
    },
    start_date: {
      type: Date
    },
    end_date: {
      type: Date
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


EventManageSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('EventManage', EventManageSchema)
