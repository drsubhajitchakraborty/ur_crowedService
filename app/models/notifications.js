var mongoose = require('mongoose');
// var bcrypt = require('bcrypt-nodejs');
var Schema = mongoose.Schema;

var NotificationsSchema = new Schema({

    title: {type: String, default: null},
    description: {type: String, default: null},
    msg_read: {type: String, default: null},
    user_id: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {type: String, default: null}

},{
    timestamps: true,
    typecast: true
});

module.exports = mongoose.model('Notifications', NotificationsSchema);
