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
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('creation created');
    });
    return deferred.promise;
};

exports.getAll = function(req, res) {
    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);

    return Q(Model.Creation.find({isPrivate: false}).skip(offset).limit(size).exec());
};

exports.getById = function(req, res) {
    return Q(Model.Creation.findOne({_id: req.params.id, isPrivate: false}).exec());
};

exports.getByIdPrivate = function(req, res) {
    var query = {};
    if (req.user.isAdmin)
        query = {_id: req.params.id};
    else
        query = {_id: req.params.id, isPrivate: true, authUser: req.user._id};
    return Q(Model.Creation.findOne(query).exec());
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
            deferred.reject(errMod.getError(err, 500));
        else {
            if (creation === null) {
                deferred.resolve(creation);
                return deferred.promise;
            }
            var fields = ['name', 'creator', 'creatorGroup', 'nbLikes', 'comments', 'isPrivate', 'authUser', 'url'];
            fields.forEach(function (field) {
                if (req.body[field]) creation[field] = req.body[field];
            });
            creation.save(function(err, creation) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
                else
                    deferred.resolve(creation);
            });
        }
    });
    return deferred.promise;
};

exports.delete = function(req, res) {
    return Q(Model.Creation.remove({_id: req.params.id}).exec());
};