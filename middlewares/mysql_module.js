/**
 * Created by Eric on 21/03/2015.
 */

var Q = require('q'),
    errMod = require('./error_module.js');

exports.handleConnection = function(callback, req) {
    var deferred = Q.defer();

    req.mysql.getConnection(function(err, connection) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            callback(connection, req, deferred);
    });
    return deferred.promise;
};

exports.getOneRow = function(connection, query, deferred) {
    connection.query(query, function(err, rows) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            if (rows.length === 0)
                deferred.resolve(null);
            else
                deferred.resolve(rows[0]);
        }
        connection.release();
    });
};

exports.getAllRows = function(connection, query, deferred) {
    connection.query(query, function(err, rows) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            if (rows.length === 0)
                deferred.resolve(null);
            else
                deferred.resolve(rows);
        }
        connection.release();
    });
};

exports.updateManyToManyRel = function(connection, table, id1, id1Res, id2, newData, deferred) {
    connection.query('DELETE FROM ' + table + ' WHERE ' + id1 + '=' + id1Res, function(err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            for (var i = 0; i < newData.length; i++) {
                connection.query('INSERT INTO ' + table + ' SET ' + id1 + '=' + id1Res + ', ' + id2 + '=' + newData[i], function(err) {
                    if (err)
                        deferred.reject(errMod.getError(err, 500));
                });
            }
        }
    });
};

exports.updateManyToOneRel = function(connection, table, id1, idRes, DataToChange, deferred) {
    connection.query('UPDATE ' + table + ' SET ' + id1 + '=' + null + ' WHERE ' + id1 + '=' + idRes, function(err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            for (var i = 0; i < DataToChange.length; i++) {
                connection.query('UPDATE ' + table + ' SET ' + id1 + '=' + idRes + ' WHERE _id=' + DataToChange[i], function(err) {
                    if (err)
                        deferred.reject(errMod.getError(err, 500));
                });
            }
        }
    })
};

exports.updateOneToOne = function(connection, table, id, newData, deferred) {
    connection.query('UPDATE ' + table + ' SET ? WHERE _id=' + id, newData, function(err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
    });
};

/*connection.query('DELETE FROM users_creations WHERE user_id=' + req.params.id, function(err) {
    if (err)
        deferred.reject(errMod.getError(err, 500));
    else {
        for (var i = 0; i < req.body.creation.length; i++) {
            connection.query('INSERT INTO users_creations SET user_id=' + req.params.id + ', creation_id=' + req.body.creation[i], function(err) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
            });
        }
    }
});*/