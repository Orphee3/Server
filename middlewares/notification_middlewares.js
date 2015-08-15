/**
 * Created by superphung on 8/14/15.
 */

var Q = require('q'),
    Model = require('../models/data_models'),
    errMod = require('./error_module');

exports.create = function (obj) {
    var deferred = Q.defer();

    var notification = new Model.Notification();

    notification.type = obj.type;
    if (obj.media) notification.media = obj.media;
    notification.userSource = obj.userSource;

    notification.save(function (err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve(notification);
    });
    return deferred.promise;
};

exports.find = function (obj) {
    var deferred = Q.defer();

    Model.Notification.find(obj, function (err, notifs) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve(notifs);
    });
    return deferred.promise;
};

exports.delete = function (id) {
    var deferred = Q.defer();

    Model.Notification.remove({_id: id}, function (err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('delete notification');
    });
    return deferred.promise;
};