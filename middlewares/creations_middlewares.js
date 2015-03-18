/**
 * Created by superphung on 3/1/15.
 */

var Q = require('q'),
    Model = require('../models/data_models'),
    errMod = require('./error_module.js'),
    utilities = require('./utilities_module.js');

exports.create = function(req, res) {
    var deferred = Q.defer(),
        creation = new Model.Creation();

    creation.name = req.body.name;
    if (req.body.dateCreation) creation.dateCreation = req.body.dateCreation;
    creation.creator = req.body.creator;
    creation.creatorGroup = req.body.creatorGroup;

    creation.save(function(err) {
        if (err)
            deferred.reject(errMod.getError500(err));
        else
            deferred.resolve('creation created');
    });
    return deferred.promise;
};

exports.getAll = function(req, res) {
    var deferred = Q.defer();

    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);

    Model.Creation.find()
        .skip(offset)
        .limit(size)
        .exec(function(err, creations) {
            if (err)
                deferred.reject(errMod.getError500(err));
            else
                deferred.resolve(creations);
        });
    return deferred.promise;
};

exports.getById = function(req, res) {
    var deferred = Q.defer();

    Model.Creation.findById(req.params.id, function(err, creation) {
        if (err)
            deferred.reject(errMod.getError500(err));
        else
            deferred.resolve(creation);
    });
    return deferred.promise;
};

exports.getCreator = function(req, res) {
    return utilities.getModelRefInfo(Model.Creation, req.params.id, 'creator');
};

exports.getCreatorGroup = function(req, res) {
    return utilities.getModelRefInfo(Model.Creation, req.params.id, 'creatorGroup')
};

exports.getComments = function(req, res) {
    return utilities.getModelRefInfo(Model.Creation, req.params.id, 'comments')
};

exports.update = function(req, res) {
    var deferred = Q.defer();

    Model.Creation.findById(req.params.id, function(err, creation) {
        if (err)
            deferred.reject(errMod.getError500(err));
        else {
            if (creation === null) {
                deferred.resolve(creation);
                return deferred.promise;
            }
            if (req.body.name) creation.name = req.body.name;
            if (req.body.creator) creation.creator = req.body.creator;
            if (req.body.creatorGroup) creation.creatorGroup = req.body.creatorGroup;
            if (req.body.nbLikes) creation.nbLikes = req.body.nbLikes;
            if (req.body.comments) creation.comments = req.body.comments;
            creation.save(function(err, creation) {
                if (err)
                    deferred.reject(errMod.getError500(err));
                else
                    deferred.resolve(creation);
            });
        }
    });
    return deferred.promise;
};

exports.delete = function(req, res) {
    var deferred = Q.defer();

    Model.Creation.remove({_id : req.params.id}, function(err, creation) {
        if (err)
            deferred.reject(errMod.getError500(err));
        else
            deferred.resolve('creation deleted');
    });
    return deferred.promise;
};