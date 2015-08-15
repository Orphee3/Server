/**
 * Created by Eric on 19/02/2015.
 */
var mongoose = require('mongoose');

var UserSchema = mongoose.Schema({
    name: String,
    username: {type: String, index: {unique: true}},
    password: {type: String, select: false},
    picture: {type: String},
    fbId: {type: String, index: {unique: true}},
    googleId: {type: Number, index: {unique: true}},
    dateCreation: {type: Date, default: Date.now},
    creations: [{type: mongoose.Schema.Types.ObjectId, ref: 'Creation'}],
    groups: [{type: mongoose.Schema.Types.ObjectId, ref: 'Group'}],
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'Creation'}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
    friends: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    isAdmin: {type: Boolean, default: false},
    flux: [{type: mongoose.Schema.Types.ObjectId, ref: 'Notification'}],
    news: [{type: mongoose.Schema.Types.ObjectId, ref: 'Notification'}]
});

var CreationSchema = mongoose.Schema({
    name: {type: String, required: true},
    dateCreation: {type: Date, default: Date.now},
    creator: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    creatorGroup: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
    nbLikes: Number,
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
    isPrivate: {type: Boolean, default: false},
    authUser: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    awsKey: {type: String},
    url: {type: String}
});

var SubCommentSchema = mongoose.Schema({
    creation: {type: mongoose.Schema.Types.ObjectId, ref: 'Creation'},
    parentId: {type: mongoose.Schema.Types.ObjectId, ref: 'Comment'},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    dateCreation: {type: Date, default: Date.now},
    message: String
});

var CommentSchema = mongoose.Schema({
    creation: {type: mongoose.Schema.Types.ObjectId, ref: 'Creation'},
    parentId: {type: mongoose.Schema.Types.ObjectId},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    dateCreation: {type: Date, default: Date.now},
    message: String,
    child: [SubCommentSchema]
});

var NotificationSchema = mongoose.Schema({
    type: {type: String},
    media: [CreationSchema],
    viewed: {type: Boolean, default: false},
    dateCreation: {type: Date, default: Date.now},
    userSource: [UserSchema]
});

var GroupSchema = mongoose.Schema({
    name: {type: String, required: true},
    dateCreation: {type: Date, default: Date.now},
    members: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    creation: [{type: mongoose.Schema.Types.ObjectId, ref: 'Creation'}]
});

exports.User = mongoose.model('User', UserSchema);
exports.Creation = mongoose.model('Creation', CreationSchema);
exports.SubComment = mongoose.model('SubComment', SubCommentSchema);
exports.Comment = mongoose.model('Comment', CommentSchema);
exports.Notification = mongoose.model('Notification', NotificationSchema);
exports.Group = mongoose.model('Group', GroupSchema);