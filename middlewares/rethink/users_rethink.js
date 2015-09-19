/**
 * Created by superphung on 9/12/15.
 */

var r = require('rethinkdb');
var Q = require('q');

var rM = require('./rethink_module');

exports.create = create;
exports.getAll = getAll;
exports.getById = getById;
exports.getByFbId = getByFbId;
exports.getByGoogleId = getByGoogleId;
exports.getByName = getByName;
exports.getCreation = getCreation;
exports.getFriends = getFriends;
exports.getFlux = getFlux;
exports.getNews = getNews;
exports.update = update;
exports.updateRef = updateRef;

function create(req, res, next) {
    var data = {};
    data.name = req.body.name;
    data.username = req.body.username || null;
    data.password = rM.hashPassword(req.body.password);
    data.picture = req.body.picture || null;
    data.fbId = req.body.fbId || null;
    data.googleId = req.body.googleId || null;
    data.dateCreation = new Date();
    var arrayField = ['creations', 'groups', 'likes', 'comments', 'friends', 'flux', 'news', 'rooms'];
    arrayField.forEach(function (field) {
        data[field] = [];
    });
    return r.table('users')
        .insert(data, {returnChanges: true})
        .run(req.rdb)
        .then(function (result) {
            return Q(result.changes[0].new_val);
        })
        .catch(rM.reject);
}

function getAll(req) {
    var offset = (typeof req.query.offset === 'undefined') ? 0 : parseInt(req.query.offset),
        size = (typeof req.query.size === 'undefined') ? 8888 : parseInt(req.query.size);
    return r.table('users')
        .skip(offset)
        .limit(size)
        .run(req.rdb)
        .then(rM.resolveArray)
        .catch(rM.reject);
}

function getById(req) {
    return r.table('users')
        .get(req.params.id)
        .run(req.rdb)
        .then(rM.resolve)
        .catch(rM.reject);
}

function getByFbId(req) {
    return r.table('users')
        .filter(r.row('fbId').eq(req.params.fbId))
        .limit(1)
        .run(req.rdb)
        .then(rM.resolveArray)
        .then(function (res) {
            if (res.length)
                return Q(res[0]);
            else
                return Q(null);
        })
        .catch(rM.reject);
}

function getByGoogleId(req) {
    return r.table('users')
        .filter(r.row('googleId').eq(req.params.googleId))
        .limit(1)
        .run(req.rdb)
        .then(rM.resolveArray)
        .then(function (res) {
            if (res.length)
                return Q(res[0]);
            else
                return Q(null);
        })
        .catch(rM.reject);
}

function getByName(req) {
    var offset = (typeof req.query.offset === 'undefined') ? 0 : parseInt(req.query.offset),
        size = (typeof req.query.size === 'undefined') ? 8888 : parseInt(req.query.size);
    var candidateName = "(?i)^" + req.params.name;

    return r.table('users')
        .filter(function (doc) {
            return doc('name').match(candidateName);
        })
        .skip(offset)
        .limit(size)
        .run(req.rdb)
        .then(rM.resolveArray)
        .catch(rM.reject);
}

function getCreation(req) {
    return r.table('users')
        .get(req.params.id)
        .run(req.rdb)
        .then(function (user) {
            return Q.all(user.creations.map(function (creation) {
                return r.table('creations').get(creation).run(req.rdb).then(rM.resolve);
            }));
        })
        .spread(rM.resolveArgs)
        .catch(rM.reject);
}

function getCreationPrivate() {

}

function getGroup(req) {

}

function getLikes(req) {

}

function getComments(req) {

}

function getFriends(req) {
    return r.table('users')
        .get(req.params.id)
        .run(req.rdb)
        .then(function (user) {
            return Q.all(user.friends.map(function (friend) {
                return r.table('users').get(friend).run(req.rdb).then(rM.resolve);
            }));
        })
        .spread(rM.resolveArgs)
        .catch(rM.reject);
}

function getFlux(req) {
    return r.table('users')
        .get(req.params.id)
        .run(req.rdb)
        .then(function (user) {
            return Q.all(user.flux.map(function (f) {
                return r.table('notifications').get(f).run(req.rdb).then(rM.resolve);
            }));
        })
        .spread(rM.resolveArgs)
        .catch(rM.reject);
}

function getNews(req) {
    return r.table('users')
        .get(req.params.id)
        .run(req.rdb)
        .then(function (user) {
            return Q.all(user.news.map(function (n) {
                return r.table('notifications').get(n).run(req.rdb).then(rM.resolve);
            }));
        })
        .spread(rM.resolveArgs)
        .catch(rM.reject);
}

function getLastNews(req) {

}

function getRooms(req) {

}

function update(req) {
    var data = {};
    var fields = ['name', 'username', 'password', 'picture', 'creations', 'groups', 'likes', 'comments',
        'friends', 'flux', 'news', 'rooms'];
    fields.forEach(function (field) {
        if (req.body[field]) data[field] = req.body[field];
    });
    return r.table('users')
        .get(req.params.id)
        .update(data, {returnChanges: true})
        .run(req.rdb)
        .then(function (res) {
            return Q.resolve(res.changes[0].new_val);
        })
        .catch(rM.reject);
}

function updateRef(req, obj) {
    return r.table('users')
        .get(req.params.id)
        .update(obj, {returnChanges: true})
        .run(req.rdb)
        .then(function (res) {
            return Q.resolve(res.changes[0].new_val);
        })
        .catch(rM.reject);
}

exports.delete = function (req) {
    return r.table('users')
        .get(req.params.id)
        .delete()
        .run(req.rdb)
        .then(rM.resolve)
        .catch(rM.reject);
};