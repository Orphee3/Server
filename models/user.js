/**
 * Created by Eric on 19/02/2015.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    name: String,
    username: {type: String, required: true, index: {unique: true}},
    password: {type: String, required: true, select: false},
    creation: Array,
    group: Array,
    likes: Array,
    comments: Array,
    friends: Array
});

module.exports = mongoose.model('User', UserSchema);