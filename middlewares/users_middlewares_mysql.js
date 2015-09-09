/**
 * Created by Eric on 20/03/2015.
 */

var errMod = require('./error_module.js'),
    sqlMod = require('./mysql_module.js');

function handleCreate(connection, req, deferred) {
    var data = {
        username: req.body.username,
        password: sqlMod.hashMysqlPassword(req.body.password)
    };
    if (req.body.name) data.name = req.body.name;
    if (req.body.fbId) data.fbId = req.body.fbId;
    if (req.body.googleId) data.googleId = req.body.googleId;
    if (req.body.picture) data.picture = req.body.picture;
    connection.query('INSERT INTO users SET ?', data, function (err, res) {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY')
                deferred.reject(errMod.getError(err, 409));
            else
                deferred.reject(errMod.getError(err, 500));
        }
        else {
            data._id = res.insertId;
            deferred.resolve(data);
        }
        connection.release();
    });
}

function handleGetAll(connection, req, deferred) {
    var offset = ('undefined' === typeof req.query.offset) ? 0 : req.query.offset;
    var size = ('undefined' === typeof req.query.size) ? 8888 : req.query.size;
    sqlMod.getAllRows(connection, 'SELECT * FROM users LIMIT ' + offset + ',' + size, deferred);
}

function handleGetById(connection, req, deferred) {
    sqlMod.getOneRow(connection, 'SELECT * FROM users WHERE _id=' + req.params.id, deferred);
}

function handleGetByFbId(connection, req, deferred) {
    sqlMod.getOneRow(connection, 'SELECT * FROM users WHERE fbId=' + req.params.fbId, deferred);
}

function handleGetByGoogleId(connection , req, deferred) {
    sqlMod.getOneRow(connection, 'SELECT * FROM users WHERE googleId=' + req.params.googleId, deferred);
}

function handleGetByName(connection, req, deferred) {
    var offset = ('undefined' === typeof req.query.offset) ? 0 : req.query.offset;
    var size = ('undefined' === typeof req.query.size) ? 8888 : req.query.size;
    sqlMod.getAllRows(connection, "SELECT * FROM users WHERE name REGEXP '^" + req.params.name + "'" + " LIMIT " + offset + "," + size, deferred);
}

function handleGetCreation(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT creations._id, creations.name, creations.dateCreation, creations.nbLikes, creations.group_id, creations.isPrivate ' +
        'FROM creations INNER JOIN users_creations ON creations._id = users_creations.creation_id INNER JOIN users ON users_creations.user_id = users._id ' +
        'WHERE creations.isPrivate=0 AND users_creations.user_id=' + req.params.id, deferred);
}

function handleGetCreationPrivate(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT creations._id, creations.name, creations.dateCreation, creations.nbLikes, creations.group_id, creations.isPrivate ' +
        'FROM creations INNER JOIN users_creations ON creations._id = users_creations.creation_id INNER JOIN users users_cre ON users_creations.user_id = users_cre._id ' +
        'INNER JOIN users_auth_creations ON creations._id = users_auth_creations.creation_id INNER JOIN users users_auth ON users_auth_creations.user_id = users_auth._id ' +
        'WHERE creations.isPrivate=1 AND users_creations.user_id=' + req.params.id + ' AND users_auth_creations.user_id=' + req.user._id, deferred);
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
    sqlMod.getAllRows(connection, 'SELECT _id, name, username, picture, dateCreation ' +
        'FROM users WHERE _id in (SELECT user2_id FROM friends WHERE user1_id=' + req.params.id + ')', deferred);
}

//@todo get ref
function handleGetFlux(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT notifications._id, notifications.type, notifications.media, notifications.userSource, notifications.dateCreation ' +
        'FROM notifications INNER JOIN users_flux ON notifications._id = users_flux.notification_id INNER JOIN users ON users_flux.user_id = users._id ' +
        'WHERE users_flux.user_id=' + req.params.id, deferred);
}

function handleGetFluxId(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT notifications._id ' +
        'FROM notifications INNER JOIN users_flux ON notifications._id = users_flux.notification_id INNER JOIN users ON users_flux.user_id = users._id ' +
        'WHERE users_flux.user_id=' + req.params.id, deferred);
}

//@todo get ref
function handleGetNews(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT notifications._id, notifications.type, notifications.media, notifications.userSource, notifications.dateCreation ' +
        'FROM notifications INNER JOIN users_news ON notifications._id = users_news.notification_id INNER JOIN users ON users_news.user_id = users._id ' +
        'WHERE users_news.user_id=' + req.params.id, deferred);
}

function handleGetNewsId(connection, req, deferred) {
    sqlMod.getAllRows(connection, 'SELECT notifications._id ' +
        'FROM notifications INNER JOIN users_news ON notifications._id = users_news.notification_id INNER JOIN users ON users_news.user_id = users._id ' +
        'WHERE users_news.user_id=' + req.params.id, deferred);
}

function handleUpdate(connection, req, deferred) {
    var data = {};
    if (req.body.name) data.name = req.body.name;
    if (req.body.username) data.username = req.body.username;
    if (req.body.password) data.password = sqlMod.hashMysqlPassword(req.body.password);
    if (req.body.picture) data.picture = req.body.picture;
    if (req.body.creations) sqlMod.updateManyToManyRel(connection, 'users_creations', 'user_id', req.params.id, 'creation_id', req.body.creations, deferred);
    if (req.body.groups) sqlMod.updateManyToManyRel(connection, 'users_groups', 'user_id', req.params.id, 'group_id', req.body.groups, deferred);
    if (req.body.likes) sqlMod.updateManyToManyRel(connection, 'users_likes', 'user_id', req.params.id, 'creation_id', req.body.likes, deferred);
    if (req.body.comments) sqlMod.updateManyToOneRel(connection, 'comments', 'user_id', req.params.id, req.body.comments, deferred);
    if (req.body.friends) sqlMod.updateManyToManyRel(connection, 'friends', 'user1_id', req.params.id, 'user2_id', req.body.friends, deferred);
    if (req.body.flux) sqlMod.updateManyToManyRel(connection, 'users_flux', 'user_id', req.params.id, 'notification_id', req.body.flux, deferred);
    if (req.body.news) sqlMod.updateManyToManyRel(connection, 'users_news', 'user_id', req.params.id, 'notification_id', req.body.news, deferred);

    if (data.name || data.username || data.password || data.picture) sqlMod.updateOneToOne(connection, 'users', req.params.id, data, deferred);

    handleGetById(connection, req, deferred);
}

function handleDelete(connection, req, deferred) {
    connection.query('DELETE FROM users WHERE _id = ?', req.params.id, function (err) {
        if (err)
            deferred.reject(errMod.getError(err, 500));
        else
            deferred.resolve('user deleted');
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

exports.getByFbId = function (req, res) {
    return sqlMod.handleConnection(handleGetByFbId, req);
};

exports.getByGoogleId = function (req, res) {
    return sqlMod.handleConnection(handleGetByGoogleId, req);
};

exports.getByName = function (req, res) {
    return sqlMod.handleConnection(handleGetByName, req);
};

exports.getCreation = function (req, res) {
    return sqlMod.handleConnection(handleGetCreation, req);
};

exports.getCreationPrivate = function (req, res) {
    return sqlMod.handleConnection(handleGetCreationPrivate, req);
};

exports.getGroup = function (req, res) {
    return sqlMod.handleConnection(handleGetGroup, req);
};

exports.getLikes = function (req, res) {
    return sqlMod.handleConnection(handleGetLikes, req);
};

exports.getComments = function (req, res) {
    return sqlMod.handleConnection(handleGetComments, req);
};

exports.getFriends = function (req, res) {
    return sqlMod.handleConnection(handleGetFriends, req);
};

exports.getFlux = function (req, res) {
    return sqlMod.handleConnection(handleGetFlux, req);
};

exports.getFluxId = function (req, res) {
    return sqlMod.handleConnection(handleGetFluxId, req);
};

exports.getNews = function (req, res) {
    return sqlMod.handleConnection(handleGetNews, req);
};

exports.getNewsId = function (req, res) {
    return sqlMod.handleConnection(handleGetNewsId, req);
};

exports.update = function (req, res) {
    return sqlMod.handleConnection(handleUpdate, req);
};

exports.delete = function (req, res) {
    return sqlMod.handleConnection(handleDelete, req);
};