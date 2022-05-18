var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var FAQSchema = new Schema({
            question: {type: String, default: null},
            answer: {type: String,default:null},
            isActive:{type:Boolean, default:true}

},{
    timestamps: true,
    typecast: true
});


module.exports = mongoose.model('FAQ', FAQSchema);
