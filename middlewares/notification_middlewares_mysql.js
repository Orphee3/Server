/**
 * Created by superphung on 9/6/15.
 */

var Q = require('q'),
    errMod = require('./error_module.js'),
    sqlMod = require('./mysql_module');

exports.create = function (obj, req) {
    var deferred = Q.defer();

    console.log('create obj', obj);

    req.mysql.getConnection(function (err, connection) {
        if (err) deferred.reject(errMod.getError(err, 500));
        else {
            var data = {
                type: obj.type
            };
            if (obj.media) {
                if (obj.media._id) data.media = obj.media._id;
                else data.media = obj.media;
            }
            if (obj.userSource._id) data.userSource = obj.userSource._id;
            else if (obj.userSource) data.userSource = obj.userSource;
            connection.query('INSERT INTO notifications SET ?', data, function (err, res) {
                if (err) {
                    console.log('err create', err);
                    deferred.reject(errMod.getError(err, 500));
                }
                else {
                    data._id = res.insertId;
                    deferred.resolve(data);
                }
                connection.release();
            });
        }
    });
    return deferred.promise;
};

function handleDelete(connection, req, deferred) {
    connection.query('DELETE FROM notifications WHERE _id = ?', req.params.id, function (err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('notification deleted');
        connection.release();
    });
}

exports.delete = function (req, id) {
    req.params.id = id;
    return sqlMod.handleConnection(handleDelete, req)
};