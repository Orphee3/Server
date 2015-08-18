/**
 * Created by superphung on 8/18/15.
 */

var Model = require('../models/data_models');
var Q = require('q');

exports.findByNameOrCreate = findByNameOrCreate;
exports.getPrivateMessage = getPrivateMessage;
exports.update = update;

function findByNameOrCreate(idSource, idTarget) {
    var deferred = Q.defer();
    var idRoom = idSource > idTarget ? (idSource + idTarget) : (idTarget + idSource);

    Model.Room.findOne({name: idRoom}, function (err, existingRoom) {
        if (err)
            deferred.reject(err);
        else {
            if (existingRoom) deferred.resolve(existingRoom);
            else {
                var newRoom = new Model.Room();
                newRoom.name = idRoom;
                newRoom.people = [idSource, idTarget];
                newRoom.save(function (err) {
                    if (err)
                        deferred.reject(err);
                    else
                        deferred.resolve(newRoom);
                });
            }
        }
    });
    return deferred.promise;
}

function getPrivateMessage(req) {
    var deferred = Q.defer(),
        offset = parseInt(req.query.offset),
        size = parseInt(req.query.size),
        sid = req.user_id,
        tid = req.params.id,
        idRoom = sid > tid ? (sid + tid) : (tid + sid);

    Model.Room.findOne({name: idRoom})
        .populate({
            path: 'messages',
            options: {
                skip: offset,
                limit: size
            }
        }).exec(function (err, data) {
            if (err)
                deferred.reject(err);
            else
                deferred.resolve(data.messages);
        });
    return deferred.promise;
}

function update(req) {
    var deferred = Q.defer();

    Model.Room.findById(req.params.id, function (err, room) {
        if (err)
            deferred.reject(err);
        else {
            var fields = ['people', 'messages', 'lastMessageDate'];
            fields.forEach(function (field) {
                if (req.body[field])
                    room[field] = req.body[field];
            });
            room.save(function (err) {
                if (err)
                    deferred.reject(err);
                else
                    deferred.resolve(room);

            });
        }
    });
    return deferred.promise;
}