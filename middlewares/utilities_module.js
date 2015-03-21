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
                deferred.reject(errMod.getError(err, 500));
            else {
                if (data === null)
                    deferred.resolve(data);
                else
                    deferred.resolve(data[field]);
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
        .catch(function(err) {return res.status(err.status).json(err.message);})
        .done();
};