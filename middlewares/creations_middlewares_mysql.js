/**
 * Created by Eric on 21/03/2015.
 */

var errMod = require('./error_module.js'),
    sqlMod = require('./mysql_module.js');

function handleCreate(connection, req, deferred) {
    var data = {name: req.body.name};
    if (req.body.nbLikes) data.nbLikes = req.body.nbLikes;
    if (req.body.creatorGroup) data.group_id = req.body.creatorGroup;
    connection.query('INSERT INTO creations SET ?', data, function(err, res) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else {
            if (req.body.creator) {
                for (var i = 0; i < req.body.creator.length; i++) {
                    connection.query('INSERT INTO users_creations SET user_id=' + req.body.creator[i] + ', creation_id=' + res.insertId, function(err) {
                        if (err)
                            deferred.reject(errMod.getError(err, 500));
                    });
                }
            }
            deferred.resolve('creation created');
        }
        connection.release();
    });
}

function handleGetAll(connection, req, deferred) {
    var offset = ('undefined' === typeof req.query.offset) ? 0 : req.query.offset;
    var size = ('undefined' === typeof req.query.size) ? 8888 : req.query.size;
    sqlMod.getAllRows(connection, 'SELECT * FROM creations LIMIT ' + offset + ', ' + size, deferred);
}

function handleGetById(connection, req, deferred) {
    sqlMod.getOneRow(connection, 'SELECT * FROM creations WHERE _id=' + req.params.id, deferred);
}

function handleGetCreator(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT users._id, users.name, users.username, users.dateCreation ' +
    'FROM users INNER JOIN users_creations ON users._id = users_creations.user_id INNER JOIN creations ON users_creations.creation_id = creations._id ' +
    'WHERE users_creations.creation_id=' + req.params.id, deferred);
}

function handleGetCreatorGroup(connection, req, deferred) {
    sqlMod.getOneRow(connection, 'SELECT groups._id, groups.name, groups.dateCreation ' +
    'FROM groups INNER JOIN creations ON groups._id = creations.group_id ' +
    'WHERE creations._id=' + req.params.id, deferred);
}

function handleGetComments(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT comments._id, comments.user_id, comments.creation_id, comments.dateCreation, comments.message ' +
    'FROM comments INNER JOIN creations ON comments.creation_id = creations._id ' +
    'WHERE creations._id=' + req.params.id, deferred);
}

function handleUpdate(connection, req, deferred) {
    var data = {};
    if (req.body.name) data.name = req.body.name;
    if (req.body.creator) sqlMod.updateManyToManyRel(connection, 'users_creations', 'creation_id', req.params.id, 'user_id', req.body.creator, deferred);
    if (req.body.creatorGroup) data.group_id = req.body.creatorGroup;
    if (req.body.nbLikes) data.nbLikes = req.body.nbLikes;
    if (req.body.comments) sqlMod.updateManyToOneRel(connection, 'comments', 'creation_id', req.params.id, req.body.comments, deferred);
    if (data.name || data.creatorGroup || data.nbLikes) sqlMod.updateOneToOne(connection, 'creations', req.params.id, data, deferred);
    handleGetById(connection, req, deferred);
}

function handleDelete(connection, req, deferred) {
    connection.query('DELETE FROM creations WHERE _id = ?', req.params.id, function(err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('creation deleted');
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

exports.getCreator = function(req, res) {
    return sqlMod.handleConnection(handleGetCreator, req);
};

exports.getCreatorGroup = function(req, res) {
    return sqlMod.handleConnection(handleGetCreatorGroup, req);
};

exports.getComments = function(req, res) {
    return sqlMod.handleConnection(handleGetComments, req);
};

exports.update = function(req, res) {
    return sqlMod.handleConnection(handleUpdate, req);
};

exports.delete = function(req, res) {
    return sqlMod.handleConnection(handleDelete, req);
};