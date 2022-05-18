const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const RoomManageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    image_360_degree: {
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


RoomManageSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('RoomManage', RoomManageSchema)
