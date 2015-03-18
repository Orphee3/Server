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

    user.save(function(err) {
        if (err) {
            var error;
            if (err.code == 11000) {
                error = new Error('user already exist');
                error.status = 409;
            }
            else {
                error = new Error(err);
                error.status = 500;
            }
            deferred.reject(error);
        }
        else
            deferred.resolve('user created');
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
                deferred.reject(errMod.getError500(err));
            else
                deferred.resolve(users);
        });
    return deferred.promise;
};

exports.getById = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id, function(err, user) {
        if (err)
            deferred.reject(errMod.getError500(err));
        else
            deferred.resolve(user);
    });
    return deferred.promise;
};

exports.getCreation = function(req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'creation');
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
           deferred.reject(errMod.getError500(err));
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
                    deferred.reject(errMod.getError500(err));
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
            deferred.reject(errMod.getError500(err));
        else
            deferred.resolve('user deleted');
    });
    return deferred.promise;
};

