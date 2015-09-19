/**
 * Created by superphung on 9/14/15.
 */

var r = require('rethinkdb');
var Q = require('q');

var rM = require('./rethink_module');
var User = require('./users_rethink');

exports.create = create;
exports.getAll = getAll;
exports.getById = getById;
exports.getPopular = getPopular;
exports.getCreator = getCreator;
exports.update = update;

function create(req, res, next) {
    var data = {};

    data.name = req.body.name;
    data.dateCreation = new Date();
    if (typeof req.body.creator === 'string')
        data.creator = [req.body.creator];
    else
        data.creator = req.body.creator;
    data.nbLikes = 0;
    data.comments = [];
    data.isPrivate = false;
    data.authUser = [];
    data.url = null;
    data.picture = null;
    return r.table('creations')
        .insert(data, {returnChanges: true})
        .run(req.rdb)
        .then(createCreation)
        .then(updateUser)
        .spread(rM.resolve)
        .catch(rM.reject);

    function createCreation(res) {
        if (res.inserted !== 1) {
            return rM.reject('document not inserted');
        } else {
            return Q(res.changes[0].new_val);
        }
    }

    function updateUser(creation) {
        var users, promises;
        if (typeof req.body.creator === 'string') users = [req.user._id];
        else users = req.body.creator;
        promises  = users.map(function (user) {
            return User.updateRef({rdb: req.rdb, params: {id: user}}, {
                creations: r.row('creations').append(creation._id)
            });
        });
        promises.unshift(creation);
        return promises;
    }
}

function getAll(req) {
    return r.table('creations')
        .run(req.rdb)
        .then(rM.resolveArray)
        .catch(rM.reject);
}

function getById(req) {
    return r.table('creations')
        .get(req.params.id)
        .run(req.rdb)
        .then(rM.resolve)
        .catch(rM.reject);
}

function getByIdPrivate(req) {

}

function getPopular(req) {
    var offset = (typeof req.query.offset === 'undefined') ? 0 : parseInt(req.query.offset),
        size = (typeof req.query.size === 'undefined') ? 8888 : parseInt(req.query.size);
    return r.table('creations')
        .map(function (creation) {
            return creation.merge({
                creator: r.table('users')
                    .filter(function (user) {
                        return creation('creator').contains(user('_id'))
                    })
                    .pluck('_id', 'name', 'picture')
                    .coerceTo('array')
            });
        })
        .orderBy(r.desc('nbLikes'))
        .skip(offset)
        .limit(size)
        .run(req.rdb)
        .then(rM.resolveArray)
        .catch(rM.reject);
}

function getCreator(req) {
    return r.table('creations')
        .get(req.params.id)
        .run(req.rdb)
        .then(function (creation) {
            return Q.all(creation.creator.map(function (c) {
                return r.table('users').get(c).run(req.rdb).then(rM.resolve);
            }));
        })
        .spread(rM.resolveArgs)
        .catch(rM.reject);
}

function getCreatorGroup() {

}



function update(req) {
    var data = {};
    var fields = ['name', 'creator', 'creatorGroup', 'nbLikes', 'comments', 'isPrivate', 'authUser', 'url', 'picture'];
    fields.forEach(function (field) {
        if (req.body[field]) data[field] = req.body[field];
    });
    return r.table('creations')
        .get(req.params.id)
        .update(data, {returnChanges: true})
        .run(req.rdb)
        .then(function (res) {
            if (res.unchanged) return Q(null);
            return Q.resolve(res.changes[0].new_val);
        })
        .catch(rM.reject);
}

exports.delete = function (req) {

};