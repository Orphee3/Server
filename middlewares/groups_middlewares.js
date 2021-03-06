/**
 * Created by Eric on 14/03/2015.
 */

var Q = require('q'),
    Model = require('../models/data_models.js'),
    errMod = require('../middlewares/error_module.js'),
    utilities = require('../middlewares/utilities_module.js');

exports.create = function(req, res) {
    var deferred = Q.defer(),
        group = new Model.Group();

    group.name = req.body.name;
    if (req.body.dateCreation) group.dateCreation = req.body.dateCreation;
    group.members = req.body.members;
    group.creation = req.body.creation;

    group.save(function(err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('group created');
    });
    return deferred.promise;
};

exports.getAll = function(req, res) {
    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);

    return Q(Model.Group.find().skip(offset).limit(size).exec());
};

exports.getById = function(req, res) {
    return Q(Model.Group.findById(req.params.id).exec());
};

exports.getMembers = function(req, res) {
    return utilities.getModelRefInfo(Model.Group, req.params.id, 'members');
};

exports.getCreation = function(req, res) {
    return utilities.getModelRefInfo(Model.Group, req.params.id, 'creation');
};

exports.update = function(req, res) {
    var deferred = Q.defer();

    Model.Group.findById(req.params.id, function(err, group) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            if (group === null) {
                deferred.resolve(group);
                return deferred.promise;
            }
            if (req.body.name) group.name = req.body.name;
            if (req.body.members) group.members = req.body.members;
            if (req.body.creation) group.creation = req.body.creation;
            group.save(function(err, group) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
                else
                    deferred.resolve(group);
            });
        }
    });
    return deferred.promise;
};

exports.delete = function(req, res) {
    return Q(Model.Group.remove({_id: req.params.id}).exec());
};