/**
 * Created by Eric on 19/02/2015.
 */
var Q = require('q');
var Model = require('../models/data_models');

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
            if (err) {
                //var error = new Error(err);
                //error.status = 500;
                deferred.reject(getError500(err));
            }
            else
                deferred.resolve(users);
        });
    return deferred.promise;
};

exports.getById = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id, function(err, user) {
        if (err) {
            //var error = new Error(err);
            //error.status = 500;
            deferred.reject(getError500(err));
        }
        else {
            /*if (user == null)
                deferred.resolve('no user');
            else
                deferred.resolve(user);*/
            deferred.resolve(user);
        }
    });
    //deferred.resolve('aaa');
    return deferred.promise;
};

exports.getCreation = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id)
        .populate('creation')
        .exec(function(err, user) {
            if (err)
                deferred.reject(getError500(err));
            else
                deferred.resolve(user.creation);
        });
    return deferred.promise;
};

exports.getGroup = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id)
        .populate('group')
        .exec(function(err, user) {
            if (err)
                deferred.reject(getError500(err));
            else
                deferred.resolve(user.group);
        });
    return deferred.promise;
};

exports.getLikes = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id)
        .populate('likes')
        .exec(function(err, user) {
            if (err)
                deferred.reject(getError500(err));
            else
                deferred.resolve(user.likes);
        });
    return deferred.promise;
};

exports.getComments = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id)
        .populate('comments')
        .exec(function(err, user) {
            if (err)
                deferred.reject(err);
            else
                deferred.resolve(user.comments);
        });
    return deferred.promise;
};

exports.getFriends = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id)
        .populate('friends')
        .exec(function(err, user) {
            if (err)
                deferred.reject(err);
            else
                deferred.resolve(user.friends);
        });
    return deferred.promise;
};

exports.update = function(req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id, function(err, user) {
        if (err) {
           //var error = new Error(err);
           //error.status = 500;
           deferred.reject(getError500(err));
        }
        else {
            if (req.body.name) {user.name = req.body.name;}
            if (req.body.username) {user.name = req.body.username;} //@TODO won't work if username already exist
            if (req.body.password) {user.password = req.body.password;}
            user.creation = req.body.creation;
            user.group = req.body.group;
            user.likes = req.body.likes;
            user.comments = req.body.comments;
            user.friends = req.body.friends;
            user.save(function(err, user) {
                if (err)
                    deferred.reject(getError500(err));
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
        if (err) {
            //var error = new Error(err);
            //error.status = 500;
            deferred.reject(getError500(err));
        }
        else
            deferred.resolve('user deleted');
    });
    return deferred.promise;
};

function getError500(err) {
    var error = new Error(err);
    error.status = 500;
    return error;
}
