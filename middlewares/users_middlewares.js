/**
 * Created by Eric on 19/02/2015.
 */
var Q = require('q'),
    Model = require('../models/data_models'),
    errMod = require('./error_module.js'),
    utilities = require('./utilities_module.js');

exports.create = function(req, res) {
    var deferred = Q.defer();

    var user = new Model.User();

    user.name = req.body.name;
    user.username = req.body.username;
    user.password = req.body.password;
    if (req.body.fbId) user.fbId = req.body.fbId;
    if (req.body.fbToken) user.fbToken = req.body.fbToken;
    if (req.body.googleId) user.googleId = req.body.googleId;
    if (req.body.googleToken) user.googleToken = req.body.googleToken;

    user.save(function(err) {
        if (err) {
            if (err.code == 11000)
                deferred.reject(errMod.getError('user already exist', 409));
            else
                deferred.reject(errMod.getError(err, 500));
        }
        else
            deferred.resolve(user);
            //  deferred.resolve('user created');
    });
    return deferred.promise;
};

exports.getAll = function(req, res) {
    var deferred = Q.defer();

    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);

    Model.User.find()
        .skip(offset)
        .limit(size)
        .exec(function(err, users) {
            if (err)
                deferred.reject(errMod.getError(err, 500));
            else
                deferred.resolve(users);
        });
    return deferred.promise;
};

exports.getById = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id, function(err, user) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve(user);
    });
    return deferred.promise;
};

exports.getCreation = function(req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, {path: 'creation', match: {isPrivate: false}});
};

exports.getCreationPrivate = function(req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, {path: 'creation', match: {isPrivate: true, authUser: req.user._id}});
};

exports.getGroup = function(req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'group');
};

exports.getLikes = function(req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'likes');
};

exports.getComments = function(req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'comments');
};

exports.getFriends = function(req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'friends');
};

exports.update = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id, function(err, user) {
        if (err) {
           deferred.reject(errMod.getError(err, 500));
        }
        else {
            if (user === null) {
                deferred.resolve(user);
                return deferred.promise;
            }
            if (req.body.name) user.name = req.body.name;
            if (req.body.username) user.username = req.body.username; //@TODO won't work if username already exist
            if (req.body.password) user.password = req.body.password;
            if (req.body.creation) user.creation = req.body.creation;
            if (req.body.group) user.group = req.body.group;
            if (req.body.likes) user.likes = req.body.likes;
            if (req.body.comments) user.comments = req.body.comments;
            if (req.body.friends) user.friends = req.body.friends;
            user.save(function(err, user) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
                else
                    deferred.resolve(user);
            });
        }
    });
    return deferred.promise;
};

exports.delete = function(req, res) {
    var deferred = Q.defer();

    Model.User.remove({ _id: req.params.id}, function(err, user) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('user deleted');
    });
    return deferred.promise;
};