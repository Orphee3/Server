/**
 * Created by Eric on 19/02/2015.
 */
var mongoose = require('mongoose');

var UserSchema = mongoose.Schema({
    name: String,
    username: {type: String, index: {unique: true}},
    password: {type: String, select: false},
    fbId: {type: String, index: {unique: true}},
    //fbToken: {type: String},
    googleId: {type: Number, index: {unique: true}},
    //googleToken: {type: String},
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
    authUser: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    awsKey: {type: String}
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
exports.Group = mongoose.model('Group', GroupSchema);