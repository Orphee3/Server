/**
 * Created by Eric on 19/02/2015.
 */
var Q = require('q'),
    Model = require('../models/data_models'),
    errMod = require('./error_module.js'),
    utilities = require('./utilities_module.js');

exports.create = function (req, res) {
    var deferred = Q.defer();

    var user = new Model.User();

    user.name = req.body.name;
    user.username = req.body.username;
    user.password = req.body.password;
    if (req.body.fbId) user.fbId = req.body.fbId;
    if (req.body.fbToken) user.fbToken = req.body.fbToken;
    if (req.body.googleId) user.googleId = req.body.googleId;
    if (req.body.googleToken) user.googleToken = req.body.googleToken;


    user.save(function (err) {
        if (err) {
            if (err.code == 11000)
                deferred.reject(errMod.getError('user already exist', 409));
            else
                deferred.reject(errMod.getError(err, 500));
        }
        else
            deferred.resolve(user);
    });
    return deferred.promise;
};

exports.getAll = function (req, res) {
    var offset = parseInt(req.query.offset),
        size = parseInt(req.query.size);

    return Q(Model.User.find().skip(offset).limit(size).exec());
};

exports.getById = function (req, res) {
    return Q(Model.User.findById(req.params.id, req.params.projection).exec());
};

exports.getByFbId = function (req, res) {
    return Q(Model.User.findOne({fbId: req.params.fbId}).exec());
};

exports.getByGoogleId = function (req, res) {
    return Q(Model.User.findOne({googleId: req.params.googleId}).exec());
};

exports.getByName = function (req, res) {
    var offset = parseInt(req.query.offset);
    var size = parseInt(req.query.size);

    var nameCandidate = new RegExp('\^' + req.params.name, 'i');
    return Q(Model.User.find({name: nameCandidate}).skip(offset).limit(size).exec());
};

exports.getCreation = function (req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, {path: 'creations', match: {isPrivate: false}});
    //return utilities.getModelRefInfo(Model.User, req.params.id, 'creation');
};

exports.getCreationPrivate = function (req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, {
        path: 'creations',
        match: {isPrivate: true, authUser: req.user._id}
    });
};

exports.getGroup = function (req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'groups');
};

exports.getLikes = function (req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'likes');
};

exports.getComments = function (req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'comments');
};

exports.getFriends = function (req, res) {
    return utilities.getModelRefInfo(Model.User, req.params.id, 'friends');
};

exports.getFlux = function (req, res) {
    var offset = parseInt(req.query.offset);
    var size = parseInt(req.query.size);

    return utilities.getModelRefInfo(Model.User, req.params.id, {path: 'flux', options: {skip: offset, limit: size}});
};

exports.getNews = function (req, res) {
    var offset = parseInt(req.query.offset);
    var size = parseInt(req.query.size);

    return utilities.getModelRefInfo(Model.User, req.params.id, {path: 'news', options: {skip: offset, limit: size}});
};

exports.getLastNews = function (req, res) {
    var deferred = Q.defer();
    utilities.getModelRefInfo(Model.User, req.params.id, {path: 'news', match: {viewed: false}})
        .then(updateNews)
        .catch(function (err) {
            deferred.reject(errMod.getError(err, 500));
        });

    return deferred.promise;

    function updateNews(news) {
        news.forEach(function (n) {
            n.viewed = true;
            n.save(function (err) {
                if (err) throw err;
            });
        });
        deferred.resolve(news);
    }
};

exports.getRooms = function (req) {
    var offset = parseInt(req.query.offset);
    var size = parseInt(req.query.size);

    return utilities.getModelRefInfo(Model.User, req.params.id, {path: 'rooms', options: {skip: offset, limit: size}});
};

exports.update = function (req, res) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id, function (err, user) {
        if (err) {
            deferred.reject(errMod.getError(err, 500));
        }
        else {
            if (user === null) {
                deferred.resolve(user);
                return deferred.promise;
            }
            var fields = ['name', 'username', 'password', 'picture', 'creations', 'groups', 'likes', 'comments',
                'friends', 'flux', 'news', 'rooms'];
            fields.forEach(function (field) {
                if (req.body[field]) user[field] = req.body[field];
            });
            user.save(function (err, user) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
                else
                    deferred.resolve(user);
            });
        }
    });
    return deferred.promise;
};

exports.updateRef = function (req) {
    var deferred = Q.defer();

    Model.User.findById(req.params.id, function (err, user) {
        if (err)
            deferred.reject(err);
        else {
            if (user === null) {
                deferred.resolve(user);
                return deferred.promise;
            }
            var fields = ['rooms', 'creations'];
            fields.forEach(function (field) {
                if (req.body[field]) user[field].unshift(req.body[field]);
            });
            user.save(function (err, user) {
                if (err)
                    deferred.reject(err);
                else
                    deferred.resolve(user);
            });
        }
    });
    return deferred.promise;
};

exports.delete = function (req, res) {
    return Q(Model.User.remove({_id: req.params.id}).exec());
};