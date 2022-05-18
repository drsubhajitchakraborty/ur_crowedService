const mongoose = require('mongoose')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')
// const autoIncrement = require('mongoose-auto-increment');
const ContentManagement = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true
    },
	content_type:{
		type:String,
	}
  },
  {
    versionKey: false,
    timestamps: true
  }
)
// ContentManagement.plugin(autoIncrement, { field: 'id' });
ContentManagement.plugin(mongoosePaginate)
module.exports = mongoose.model('ContentManagement', ContentManagement)
