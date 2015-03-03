/**
 * Created by superphung on 3/3/15.
 */

var Q = require('q'),
    errMod = require('./error_module.js');

exports.getModelRefInfo = function(model, id, field) {
    var deferred = Q.defer();

    model.findById(id)
        .populate(field)
        .exec(function(err, data) {
            if (err)
                deferred.reject(errMod.getError500(err));
            else
                deferred.resolve(data[field]);
        });
    return deferred.promise;
};

exports.useMiddleware = function(middleware, req, res, next) {
    middleware(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
};