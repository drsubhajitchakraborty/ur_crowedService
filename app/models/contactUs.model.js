var mongoose = require('mongoose');
const validator = require('validator')
var Schema = mongoose.Schema;

var ContactUsSchema = new Schema({
  name: { type: String },
  email: {
    type: String,
  },
  phone: { type: String },
  subject: { type: String },
  message: { type: String },
  replyMessage: { type: String },
  isActive: { type: Boolean, default: true },

},{
    timestamps: true,
    typecast: true
});


module.exports = mongoose.model('ContactUs', ContactUsSchema);
