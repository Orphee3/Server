/**
 * Created by Eric on 20/03/2015.
 */

var errMod = require('./error_module.js'),
    sqlMod = require('./mysql_module.js');

function handleCreate(connection, req, deferred) {
    var data = {
        name: req.body.name,
        username: req.body.username,
        password: req.body.password
    };
    connection.query('INSERT INTO users SET ?', data, function (err) {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY')
                deferred.reject(errMod.getError(err, 409));
            else
                deferred.reject(errMod.getError(err, 500));
        }
        else
            deferred.resolve('user created');
        connection.release();
    });
}

function handleGetAll(connection, req, deferred) {
    var offset = ('undefined' === typeof req.query.offset) ? 0 : req.query.offset;
    var size = ('undefined' === typeof req.query.size) ? 8888 : req.query.size;
    sqlMod.getAllRows(connection, 'SELECT * FROM users LIMIT ' + offset + ',' + size, deferred);
}

function handleGetById(connection, req, deferred) {
    connection.query('SELECT * FROM users WHERE _id = ?', req.params.id, function(err, rows) {
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
}

function handleGetCreation(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT creations._id, creations.name, creations.dateCreation, creations.nbLikes ' +
    'FROM creations INNER JOIN users_creations ON creations._id = users_creations.creation_id INNER JOIN users ON users_creations.user_id = users._id ' +
    'WHERE users_creations.user_id=' + req.params.id, deferred);
}

function handleGetGroup(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT groups._id, groups.name, groups.dateCreation ' +
    'FROM groups INNER JOIN users_groups ON groups._id = users_groups.group_id INNER JOIN users ON users_groups.user_id = users._id ' +
    'WHERE users_groups.user_id=' + req.params.id, deferred);
}

function handleGetLikes(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT creations._id, creations.name, creations.dateCreation, creations.nbLikes ' +
    'FROM creations INNER JOIN users_likes ON creations._id = users_likes.creation_id INNER JOIN users ON users_likes.user_id = users._id ' +
    'WHERE users_likes.user_id=' + req.params.id, deferred);
}

function handleGetComments(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT * FROM comments WHERE user_id=' + req.params.id, deferred);
}

function handleGetFriends(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT _id, name, username, dateCreation ' +
    'FROM users WHERE _id in (SELECT user2_id FROM friends WHERE user1_id='+ req.params.id + ')', deferred);
}

function handleUpdate(connection, req, deferred) {
    var data = {};
    if (req.body.name) data.name = req.body.name;
    if (req.body.username) data.username = req.body.username;
    if (req.body.password) data.password = req.body.password;
    if (req.body.creation) sqlMod.updateManyToManyRel(connection, 'users_creations', 'user_id', req.params.id, 'creation_id', req.body.creation, deferred);
    if (req.body.group) sqlMod.updateManyToManyRel(connection, 'users_groups', 'user_id', req.params.id, 'group_id', req.body.group, deferred);
    if (req.body.likes) sqlMod.updateManyToManyRel(connection, 'users_likes', 'user_id', req.params.id, 'creation_id', req.body.likes, deferred);
    if (req.body.comments) {
        connection.query('DELETE FROM comments WHERE user_id=' + req.params.id, function(err) {
            if (err)
                deferred.reject(errMod.getError(err, 500));
            else {
                for (var i = 0; i < req.body.comments.length; i++) {
                    connection.query('INSERT INTO comments SET user_id=' + req.params.id + ' WHERE _id=' + req.body.comments[i], function(err) {
                        if (err)
                            deferred.reject(errMod.getError(err, 500));
                    });
                }
            }
        });
    }
    if (req.body.friends) sqlMod.updateManyToManyRel(connection, 'friends', 'user1_id', req.params.id, 'user2_id', req.body.friends, deferred);

    if (data.name || data.username || data.password) {
        connection.query('UPDATE users SET ? WHERE _id=' + req.params.id, data, function(err) {
            if (err)
                deferred.reject(errMod.getError(err, 500));
        });
    }

    connection.query('SELECT * FROM users WHERE _id = ?', req.params.id, function(err, rows) {
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
}

function handleDelete(connection, req, deferred) {
    connection.query('DELETE FROM users WHERE _id = ?', req.params.id, function(err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('user deleted');
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

exports.getCreation = function(req, res) {
    return sqlMod.handleConnection(handleGetCreation, req);
};

exports.getGroup = function(req, res) {
    return sqlMod.handleConnection(handleGetGroup, req);
};

exports.getLikes = function(req, res) {
    return sqlMod.handleConnection(handleGetLikes, req);
};

exports.getComments = function(req, res) {
    return sqlMod.handleConnection(handleGetComments, req);
};

exports.getFriends = function(req, res) {
    return sqlMod.handleConnection(handleGetFriends, req);
};

exports.update = function(req, res) {
    return sqlMod.handleConnection(handleUpdate, req);
};

exports.delete = function(req, res) {
    return sqlMod.handleConnection(handleDelete, req);
};