/**
 * Created by Eric on 19/02/2015.
 */
var mongoose = require('mongoose');

var UserSchema = mongoose.Schema({
    name: String,
    username: {type: String, required: true, index: {unique: true}},
    password: {type: String, required: true, select: false},
    dateCreation: {type: Date, default: Date.now},
    creations: [{type: mongoose.Schema.Types.ObjectId, ref: 'Creation'}],
    groups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'Creation'}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
    friends: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    isAdmin: {type: Boolean, default: false}
});

var CreationSchema = mongoose.Schema({
    name: {type: String, required: true},
    dateCreation: {type: Date, default: Date.now},
    creator: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    creatorGroup: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
    nbLikes: Number,
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
    isPrivate: {type: Boolean, default: false},
    authUser: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
});

var CommentSchema = mongoose.Schema({
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    dateCreation: {type: Date, default: Date.now},
    message: String
});

var GroupSchema = mongoose.Schema({
    name: {type: String, required: true},
    dateCreation: {type: Date, default: Date.now},
    members: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    creation: [{type: mongoose.Schema.Types.ObjectId, ref: 'Creation'}]
});

exports.User = mongoose.model('User', UserSchema);
exports.Creation = mongoose.model('Creation', CreationSchema);
exports.Comment = mongoose.model('Comment', CommentSchema);
exports.Group = mongoose.model('Group', GroupSchema);