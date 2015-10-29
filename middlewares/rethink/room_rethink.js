/**
 * Created by superphung on 9/16/15.
 */

var Q = require('q');
var r = require('rethinkdb');

var rM = require('./rethink_module');
var User = require('./users_rethink');

exports.create = create;
exports.getById = getById;
exports.findByNameOrCreate = findByNameOrCreate;
exports.getPrivateMessage = getPrivateMessage;
exports.update = update;

function create(req) {
    var data = {};

    data.name = req.body.name || null;
    data.people = req.body.people || [];
    data.peopleTmp = req.body.peopleTmp || [];
    data.messages = [];
    data.lastMessage = null;
    data.dateCreation = new Date();
    data.lastMessageDate = data.dateCreation;
    data.private = req.body.private || false;

    return r.table('rooms')
        .insert(data, {returnChanges: true})
        .run(req.rdb)
        .then(function (result) {
            return Q(result.changes[0].new_val);
        })
        .catch(rM.reject);
}

function getById(req) {
    return r.table('rooms')
        .get(req.params.id)
        .run(req.rdb)
        .then(rM.resolve)
        .catch(rM.reject);
}

function findByNameOrCreate(idSource, idTarget, req) {
    var idRoom = idSource > idTarget ? (idSource + idTarget) : (idTarget + idSource);

    return r.table('rooms')
        .filter(r.row('name').eq(idRoom))
        .limit(1)
        .run(req.rdb)
        .then(rM.resolveArray)
        .then(function (res) {
            if (res.length){
                return Q(res[0]);
            }
            else {
                return create({
                    rdb: req.rdb,
                    body: {
                        name: idRoom,
                        people: [idSource, idTarget],
                        private: true
                    }
                }).then(function (room) {
                    console.log('room', room);
                    var promises = updateUser(room._id);
                    promises.unshift(room);
                    return Q.all(promises);
                }).spread(rM.resolve);
            }
        })
        .catch(rM.reject);

    function updateUser(roomId) {
        return [idSource, idTarget].map(function (id) {
            return r.table('users')
                .get(id)
                .run(req.rdb)
                .then(rM.resolve)
                .then(function (res) {
                    res.rooms.push(roomId);
                    return User.update({rdb: req.rdb, params: {id: id}, body: {rooms: res.rooms}});
                });
        });
    }
}

function getPrivateMessage(req) {
    var sid = req.user._id,
        tid = req.params.id,
        idRoom = sid > tid ? (sid + tid) : (tid + sid);
    return r.table('rooms')
        .filter(r.row('name').eq(idRoom))
        .limit(1)
        .map(function (room) {
            return room.merge({
                messages: r.table('messages')
                    .filter(function (message) {
                        return room('messages').contains(message('_id'))
                    })
                    .map(function (message) {
                        return message.merge({
                            creator: r.table('users').get(message('creator'))
                        })
                    }).coerceTo('array')
            });
        })
        .run(req.rdb)
        .then(function (res) {
            var r = res.toArray();
            if (r._settledValue[0])
                return Q(r._settledValue[0].messages);
            else
                return Q(null);
        })
        .catch(rM.reject);
}

function update(req) {
    var data = {};

    var fields = ['people', 'peopleTmp', 'messages', 'lastMessageDate', 'lastMessage'];
    fields.forEach(function (field) {
        if (req.body[field]) data[field] = req.body[field];
    });
    return r.table('rooms')
        .get(req.params.id)
        .update(data, {returnChanges: true})
        .run(req.rdb)
        .then(function (res) {
            return Q(res.changes[0].new_val);
        })
        .catch(rM.reject);
}