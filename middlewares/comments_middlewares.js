/**
 * Created by superphung on 3/5/15.
 */

var Q = require('q'),
    Model = require('../models/data_models.js'),
    errMod = require('./error_module.js'),
    utilities = require('./utilities_module.js');

exports.create = function(req, res) {
    var deferred = Q.defer(),
        comment = new Model.Comment();

    comment.creator = req.body.creator;
    if (req.body.dateCreation) comment.dateCreation = req.body.dateCreation;
    comment.message = req.body.message;

    comment.save(function(err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('comment created');
    });
    return deferred.promise;
};

exports.getAll = function(req, res) {
    var deferred = Q.defer();

    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);

    Model.Comment.find()
        .skip(offset)
        .limit(size)
        .exec(function(err, comments) {
            if (err)
                deferred.reject(errMod.getError(err, 500));
            else
                deferred.resolve(comments);
        });
    return deferred.promise;
};

exports.getById = function(req, res) {
    var deferred = Q.defer();

    Model.Comment.findById(req.params.id, function(err, comment) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve(comment);
    });
    return deferred.promise;
};

exports.getCreator = function(req, res) {
    return utilities.getModelRefInfo(Model.Comment, req.params.id, 'creator');
};

exports.update = function(req, res) {
    var deferred = Q.defer();

    Model.Comment.findById(req.params.id, function(err, comment) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            if (comment === null) {
                deferred.resolve(comment);
                return deferred.promise;
            }
            if (req.body.message) comment.message = req.body.message;
            comment.save(function(err, comment) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
                else
                    deferred.resolve(comment);
            });
        }
    });
    return deferred.promise;
};

exports.delete = function(req, res) {
    var deferred = Q.defer();

    Model.Comment.remove({_id: req.params.id}, function(err, comment) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('comment deleted');
    });
    return deferred.promise;
};