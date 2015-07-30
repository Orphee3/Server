/**
 * Created by Eric on 23/03/2015.
 */

var errMod = require('./error_module.js'),
    sqlMod = require('./mysql_module.js');

function handleCreate(connection, req, deferred) {
    connection.query('SELECT * FROM comments WHERE _id=' + req.body.creation, function (err, res) {
        if (err) deferred.reject(errMod.getError(err, 500));
        else {
            if (req.body.creation === req.body.parentId) {
                var data = {
                    creation: req.body.creation,
                    creator: req.body.creator,
                    message: req.body.message
                };
                connection.query('INSERT INTO comments SET ?', data, function (err, res) {
                    if (err) deferred.reject(errMod.getError(err, 500));
                    else
                        deferred.resolve('comment created');
                    connection.release();
                });
            } else {
                connection.query('SELECT * FROM comments WHERE _id=' + req.body.parentId, function (err, res) {
                    if (err) deferred.reject(errMod.getError(err, 500));
                    else {
                        var obj = {
                            creation: req.body.creation,
                            parentId: req.body.parentId,
                            creator: req.body.creator,
                            message: req.body.message
                        };
                        connection.query('INSERT INTO comments SET ?', obj, function (err, res) {
                            if (err)
                                deferred.reject(errMod.getError(err, 500));
                            else
                                deferred.resolve('sub comment created');
                            connection.release();
                        });
                    }
                });
            }
        }
    });
    /*var data = {user_id: req.body.creator};
     if (req.body.message) data.message = req.body.message;
     connection.query('INSERT INTO comments SET ?', data, function(err, res) {
     if (err)
     deferred.reject(errMod.getError(err, 500));
     else
     deferred.resolve('comment created');
     connection.release();
     });*/
}

function handleGetAll(connection, req, deferred) {
    var offset = ('undefined' === typeof req.query.offset) ? 0 : req.query.offset;
    var size = ('undefined' === typeof req.query.size) ? 8888 : req.query.size;
    sqlMod.getAllRows(connection, 'SELECT * FROM comments LIMIT ' + offset + ',' + size, deferred);
}

function handleGetById(connection, req, deferred) {
    sqlMod.getOneRow(connection, 'SELECT * FROM comments WHERE _id=' + req.params.id, deferred);
}

function handleGetCreator(connection, req, deferred) {
    sqlMod.getOneRow(connection, 'SELECT users._id, users.name, users.username, users.dateCreation ' +
        'FROM users INNER JOIN comments ON users._id = comments.creator ' +
        'WHERE comments._id=' + req.params.id, deferred);
}

function handleGetComments(connection, req, deferred) {
    var offset = ('undefined' === typeof  req.query.offset) ? 0 : req.query.offset;
    var size = ('undefined' === typeof req.query.size) ? 888 : req.query.size;
    sqlMod.getAllRows(connection, 'SELECT comments._id, comments.creator, comments.creation, comments.dateCreation, comments.message, comments.parentId ' +
        'FROM comments INNER JOIN creations ON comments.creation = creations._id ' +
        'WHERE creations._id=' + req.params.id + ' AND comments.parentId IS NULL' + ' LIMIT ' + offset + ',' + size, deferred);
}

function handleGetSubComments(connection, req, deferred) {
    var offset = ('undefined' === typeof  req.query.offset) ? 0 : req.query.offset;
    var size = ('undefined' === typeof req.query.size) ? 8888 : req.query.size;
    sqlMod.getAllRows(connection, 'SELECT comments._id, comments.creator, comments.creation, comments.dateCreation, comments.message, comments.parentId ' +
        'FROM comments WHERE comments.parentId=' + req.params.id + ' LIMIT ' + offset + ',' + size, deferred);
}

function handleUpdate(connection, req, deferred) {
    var data = {};
    if (req.body.creator) data.user_id = req.body.creator;
    if (req.body.message) data.message = req.body.message;
    if (data.user_id || data.message) sqlMod.updateOneToOne(connection, 'comments', req.params.id, data, deferred);
    handleGetById(connection, req, deferred);
}

function handleDelete(connection, req, deferred) {
    connection.query('DELETE FROM comments WHERE _id = ?', req.params.id, function (err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('comments deleted');
        connection.release();
    });
}

exports.create = function (req, res) {
    return sqlMod.handleConnection(handleCreate, req);
};

exports.getAll = function (req, res) {
    return sqlMod.handleConnection(handleGetAll, req);
};

exports.getById = function (req, res) {
    return sqlMod.handleConnection(handleGetById, req);
};

exports.getCreator = function (req, res) {
    return sqlMod.handleConnection(handleGetCreator, req);
};

exports.getCreationComments = function (req, res) {
    return sqlMod.handleConnection(handleGetComments, req);
};

exports.getSubComments = function (req, res) {
    return sqlMod.handleConnection(handleGetSubComments, req);
};

exports.update = function (req, res) {
    return sqlMod.handleConnection(handleUpdate, req);
};

exports.delete = function (req, res) {
    return sqlMod.handleConnection(handleDelete, req);
};