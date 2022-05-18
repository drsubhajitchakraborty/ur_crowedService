var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var CmsSchema = new Schema({
            page_name: {type: String},
            page_heading: {type: String},
            page_description: {type: String},
            image: {type: String},
            isActive:{type:Boolean, default:true}

},{
    timestamps: true,
    typecast: true
});


module.exports = mongoose.model('Cms', CmsSchema);
