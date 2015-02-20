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

    Model.User.find(function(err, users) {
        if (err) {
            var error = new Error(err);
            error.status = 500;
            deferred.reject(error);
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
            var error = new Error(err);
            error.status = 500;
            deferred.reject(error);
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

exports.delete = function(req, res) {
    var deferred = Q.defer();

    Model.User.remove({ _id: req.params.id}, function(err, user) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve('user deleted');
    });
    return deferred.promise;
};
