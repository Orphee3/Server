/**
 * Created by superphung on 3/3/15.
 */

var Q = require('q'),
    errMod = require('./error_module.js'),
    nconf = require('nconf');

var middleware;
if (nconf.get('db') === 'mysql')
    middleware = require('../middlewares/comments_middlewares_mysql');


exports.getModelRefInfo = function(model, id, field) {
    var deferred = Q.defer();

    model.findById(id)
        .populate(field)
        .exec(function(err, data) {
            if (err)
                deferred.reject(errMod.getError(err, 500));
            else {
                if (data === null)
                    deferred.resolve(data);
                else {
                    if (typeof field === 'object')
                        deferred.resolve(data[field.path]);
                    else
                        deferred.resolve(data[field]);
                }
            }
        });
    return deferred.promise;
};

exports.useMiddleware = function(middleware, req, res, next) {
    middleware(req, res)
        .then(function(data) {
            if (data === null)
                return res.status(204).end();
            return res.status(200).json(data);
        })
        .catch(function(err) {
            if (err.status)
                return res.status(err.status).json(err.message);
            return res.status(500).json(err);
        })
        .done();
};

exports.isUserOrAdmin = function(req, res, next) {
    console.log(req.user._id);
    console.log(req.params.id);
    console.log(req.user.isAdmin);
    if (req.user._id != req.params.id && req.user.isAdmin != true) {
        return res.status(401).json('unauthorized : not user or admin');
    }
    next();
};

exports.isCreatorOrAdmin = function(middlewareCandidate, dataCandidate) {
    var expressCreatorOrAdmin = function(req, res, next) {
        if (req.user.isAdmin)
            return next();
        if (nconf.get('db') === 'mysql') {
            middlewareCandidate(req, res)
                .then(function(data) {
                    if (data === null)
                        return next(errMod.getError('UnauthorizedError', 401));

                    var idCandidate = data.user_id ? data.user_id : data; //data._id

                    if (Array.isArray(idCandidate)) {
                        for (var i = 0; i < idCandidate.length; i++) {
                            if (req.user._id == idCandidate[i]._id)
                                return next();
                        }
                    }
                    else {
                        if (req.user._id == idCandidate)
                            return next();
                    }
                    return next(errMod.getError('UnauthorizedError', 401));
                })
                .catch(function(err) {return next(err);});
        }
        else {
            if (req.user[dataCandidate])
                if (req.user[dataCandidate].indexOf(req.params.id) >= 0)
                    return next();
            return next(errMod.getError('UnauthorizedError', 401));
        }
    };
    return expressCreatorOrAdmin;
};

exports.isAdmin = function(req, res, next) {
    if (req.user.isAdmin != true) {
        return res.status(401).json('unauthorized : not admin');
    }
    next();
};