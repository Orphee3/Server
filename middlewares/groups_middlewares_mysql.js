/**
 * Created by Eric on 26/03/2015.
 */

var errMod = require('./error_module.js'),
    sqlMod = require('./mysql_module.js');

function handleCreate(connection, req, deferred) {
    var data = {name: req.body.name};
    connection.query('INSERT INTO groups SET ?', data, function(err, res) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            if (req.body.members) {
                for (var i = 0; i < req.body.members.length; i++) {
                    connection.query('INSERT INTO users_groups SET user_id=' + req.body.members[i] + ', group_id=' + res.insertId, function(err) {
                        if (err) deferred.reject(errMod.getError(err, 500));
                    });
                }
            }
            if (req.body.creation) {
                for (var i = 0; i < req.body.creation.length; i++) {
                    connection.query('UPDATE creations SET group_id=' + res.insertId + ' WHERE _id=' + req.body.creation[i], function(err) {
                        if (err) deferred.reject(errMod.getError(err, 500));
                    });
                }
            }
            deferred.resolve('group created');
        }
        connection.release();
    });
}

function handleGetAll(connection, req, deferred) {
    var offset = ('undefined' === typeof req.query.offset) ? 0 : req.query.offset;
    var size = ('undefined' === typeof req.query.size) ? 8888 : req.query.size;
    sqlMod.getAllRows(connection, 'SELECT * FROM groups LIMIT ' + offset + ', ' + size, deferred);
}

function handleGetById(connection, req, deferred) {
    sqlMod.getOneRow(connection, 'SElECT * FROM groups WHERE _id=' + req.params.id, deferred);
}

function handleGetMembers(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT users._id, users.name, users.username, users.dateCreation ' +
    'FROM users INNER JOIN users_groups ON users._id = users_groups.user_id INNER JOIN groups ON users_groups.group_id = groups._id ' +
    'WHERE users_groups.group_id=' + req.params.id, deferred);
}

function handleGetCreation(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT creations._id, creations.name, creations.dateCreation, creations.nbLikes, creations.group_id ' +
    'FROM creations INNER JOIN groups ON creations.group_id = groups._id ' +
    'WHERE groups._id=' + req.params.id, deferred);
}

function handleUpdate(connection, req, deferred) {
    var data = {};
    if (req.body.name) data.name = req.body.name;
    if (req.body.members) sqlMod.updateManyToManyRel(connection, 'users_groups', 'group_id', req.params.id, 'user_id', req.body.members, deferred);
    if (req.body.creation) sqlMod.updateManyToOneRel(connection, 'creations', 'group_id', req.params.id, req.body.creation, deferred);
    if (data.name) sqlMod.updateOneToOne(connection, 'groups', req.params.id, data, deferred);
    handleGetById(connection, req, deferred);
}

function handleDelete(connection, req, deferred) {
    connection.query('DELETE FROM groups WHERE _id = ?', req.params.id, function(err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('group deleted');
        connection.release();
    });
}

exports.create = function(req, res) {
    return sqlMod.handleConnection(handleCreate, req);
};

exports.getAll = function(req, res) {
    return sqlMod.handleConnection(handleGetAll, req);
};

exports.getById = function(req, res) {
    return sqlMod.handleConnection(handleGetById, req);
};

exports.getMembers = function(req, res) {
    return sqlMod.handleConnection(handleGetMembers, req);
};

exports.getCreation = function(req, res) {
    return sqlMod.handleConnection(handleGetCreation, req);
};

exports.update = function(req, res) {
    return sqlMod.handleConnection(handleUpdate, req);
};

exports.delete = function(req, res) {
    return sqlMod.handleConnection(handleDelete, req);
};