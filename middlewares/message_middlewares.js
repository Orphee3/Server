/**
 * Created by superphung on 8/18/15.
 */

var Model = require('../models/data_models');
var Q = require('q');

exports.create = create;

function create(req) {
    var deferred = Q.defer();
    var m = new Model.Message();

    m.creator = req.body.creator;
    m.message = req.body.message;
    m.save(function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(m);
    });
    return deferred.promise;
}