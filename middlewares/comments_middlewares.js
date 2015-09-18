/**
 * Created by superphung on 3/5/15.
 */

var Q = require('q'),
    Model = require('../models/data_models.js'),
    errMod = require('./error_module.js'),
    utilities = require('./utilities_module.js'),
    creationMiddleware = require('./creations_middlewares');

exports.create = function (req, res) {
    var deferred = Q.defer();

    creationMiddleware.getById({params: {id: req.body.creation}}, res)
        .then(function () {
            if (req.body.creation === req.body.parentId) {
                var comment = new Model.Comment();
                comment.creation = req.body.creation;
                comment.creator = req.body.creator;
                comment.message = req.body.message;

                comment.save(function (err, c) {
                    if (err) deferred.reject(errMod.getError(err, 500));
                    else {
                        Model.Comment.findById(c._id).populate({
                            path: 'creator',
                            select: 'name picture'
                        }).exec(function (err, data) {
                            if (err) deferred.reject(err);
                            else deferred.resolve(data);
                        });
                    }
                });
            } else {
                exports.getById({params: {id: req.body.parentId}}, res)
                    .then(function (comment) {
                        var subComment = new Model.SubComment();
                        subComment.creation = req.body.creation;
                        subComment.parentId = req.body.parentId;
                        subComment.creator = req.body.creator;
                        subComment.message = req.body.message;

                        subComment.save(function (err) {
                            if (err) deferred.reject(errMod.getError(err, 500));
                            else {
                                comment.child.push(subComment);
                                comment.save(function (err, comment) {
                                    if (err) deferred.reject(errMod.getError(err, 500));
                                    else deferred.resolve(comment);
                                });
                            }
                        });
                    })
                    .catch(function (err) {
                        deferred.reject(err);
                    });
            }
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
};

function getComments(req, query) {
    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);
    return Q(Model.Comment.find(query).skip(offset).limit(size).exec());
}

exports.getAll = function (req, res) {
    return getComments(req, {});
};

exports.getById = function (req, res) {
    return Q(Model.Comment.findById(req.params.id).exec());
};

exports.getCreator = function (req, res) {
    return utilities.getModelRefInfo(Model.Comment, req.params.id, 'creator');
};

exports.getCreationComments = function (req, res) {
    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);
    return Q(Model.Comment.find({creation: req.params.id})
        .populate({
            path: 'creator',
            select: 'name picture',
            options: {
                skip: offset,
                limit: size
            }
        }).exec());
};

exports.getSubComments = function (req, res) {
    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);
    return Q(Model.SubComment.find({parentId: req.params.id}).skip(offset).limit(size).exec());
};

exports.update = function (req, res) {
    var deferred = Q.defer();

    Model.Comment.findById(req.params.id, function (err, comment) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            if (comment === null) {
                deferred.resolve(comment);
                return deferred.promise;
            }
            if (req.body.message) comment.message = req.body.message;
            comment.save(function (err, comment) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
                else
                    deferred.resolve(comment);
            });
        }
    });
    return deferred.promise;
};

exports.delete = function (req, res) {
    return Q(Model.Comment.remove({_id: req.params.id}).exec());
};