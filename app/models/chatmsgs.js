var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ChatmsgsSchema = new Schema({
            
    chat_as:  {type: String, default: null},
    user_id: [{ type: Schema.Types.ObjectId, ref: 'Appusers' }],
    chat_category_id: {type: String, default: null},
    comment: {type: String, default: null},
    chat_with: [{ type: Schema.Types.ObjectId, ref: 'Appusers' }],
    date_time: {type: String, default: null},
    status: {type: String, default: null}

},{
    timestamps: true,
    typecast: true
});



module.exports = mongoose.model('Chatmsgs', ChatmsgsSchema);
