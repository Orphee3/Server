/**
 * Created by superphung on 8/18/15.
 */

var Model = require('../models/data_models');
var Q = require('q');

exports.findByNameOrCreate = findByNameOrCreate;
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