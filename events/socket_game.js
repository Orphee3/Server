/**
 * Created by superphung on 12/17/15.
 */

var redis = require('redis');
var e = require('./socket_error');

var rooms = [];

exports.onCreateGameRoom = onCreateGameRoom;
exports.onJoinGameRoom = onJoinGameRoom;
exports.onLeaveGameRoom = onLeaveGameRoom;
exports.onKickUser = onKickUser;
exports.onGetGameRooms = onGetGameRooms;
exports.onSendDataGame = onSendDataGame;
exports.onGetAllDataGame = onGetAllDataGame;
exports.onGetDataFromHost = onGetDataFromHost;
exports.onBigBang = onBigBang;

function onCreateGameRoom(socket, data) {
    var pub = redis.createClient();

    var id = new Date().getTime().toString();

    var room = {
        id: id,
        host: socket.request.user._id,
        people: [socket.request.user._id]
    };

    rooms.push(room);

    room.type = 'create game room';

    pub.publish(socket.request.user._id, JSON.stringify(room));
    pub.quit();
}

function onJoinGameRoom(socket, data) {
    if (!data.id) return e.error(socket, 'missing params');

    var pub = redis.createClient();

    rooms.forEach(function (room, index) {
        if (JSON.stringify(room.id) === JSON.stringify(data.id)) {

            room.people.push(socket.request.user._id);

            var r = room;

            r.newPeople = socket.request.user._id;
            r.type = 'join game room';
            if(data.data) r.data = data.data;

            room.people.forEach(function (user) {
                pub.publish(user, JSON.stringify(r));
            });

            return pub.quit();
        } else if (rooms.length === index+1) return e.error(socket, 'id game room does not exist');
    });
}

function onLeaveGameRoom(socket, data) {
    if (!data.id) return e.error(socket, 'missing params');

    var pub = redis.createClient();

    rooms.forEach(function (room) {
        if (JSON.stringify(room.id) === JSON.stringify(data.id)) {

            var idx = room.people.indexOf(socket.request.user._id);
            if (idx !== -1) {
                room.people.splice(idx, 1);

                var r = room;

                r.leavePeople = socket.request.user._id;
                r.type = 'leave game room';

                room.people.forEach(function (user) {
                    pub.publish(user, JSON.stringify(r));
                });
                return pub.quit();
            }
        } else if (rooms.length === index+1) return e.error(socket, 'id game room does not exist');
    });
}

function onKickUser(socket, data) {
    if (!data.user) return e.error(socket, 'missing params');

    var pub = redis.createClient();

    rooms.forEach(function (room) {
        if (JSON.stringify(room.host) === JSON.stringify(socket.request.user._id)) {

            var idx = room.people.indexOf(data.user);

            if (idx !== -1) {
                room.people.splice(1, idx);

                var r = room;

                r.kickPeople = data.user;
                r.type = 'kick user';

                room.people.forEach(function (user) {
                    pub.publish(user, JSON.stringify(r));
                });
                return pub.quit();
            }
        }
    });
}

function onGetGameRooms(socket) {
    var pub = redis.createClient();

    pub.publish(socket.request.user._id, JSON.stringify({
        rooms: rooms,
        type: 'get game rooms'
    }));
    pub.quit();
}

function onSendDataGame(socket, data) {
    if (!data.id) return e.error(socket, 'missing params');

    var pub = redis.createClient();

    rooms.forEach(function (room, index) {
        if (JSON.stringify(room.id) === JSON.stringify(data.id)) {
            room.people.forEach(function (user) {
                if (JSON.stringify(user) !== JSON.stringify(socket.request.user._id)) {
                    data.type = 'data game';
                    pub.publish(user, JSON.stringify(data));
                }
            });
            pub.quit();
        } else if (rooms.length === index+1) return e.error(socket, 'id game room does not exist');
    })
}

function onGetAllDataGame(socket, data) {
    if (!data.id) return e.error(socket, 'missing params');

    var pub = redis.createClient();

    rooms.forEach(function (room, index) {
        if (JSON.stringify(room.id) === JSON.stringify(data.id)) {
            pub.publish(room.host, JSON.stringify({
                type: 'someone need all data',
                user: socket.request.user._id
            }));
            pub.quit();
        } else if (rooms.length === index+1) return e.error(socket, 'id game room does not exist');
    })
}

function onGetDataFromHost(socket, data) {
    if (!data.user) return e.error(socket, 'missing params');

    var pub = redis.createClient();

    rooms.forEach(function (room, index) {
        if (JSON.stringify(room.host) === JSON.stringify(socket.request.user._id)) {
            data.type = 'get all data game';
            pub.publish(data.user, JSON.stringify(data));
            pub.quit();
        }
    });
}

function onBigBang(socket) {
    var pub = redis.createClient();

    rooms.forEach(function (room, index) {
        if (JSON.stringify(room.host) === JSON.stringify(socket.request.user._id)) {
            room.people.forEach(function (user) {
                pub.publish(user, JSON.stringify({type: 'big bang'}));
            });
            pub.quit();
            rooms.splice(index, 1);
        }
    });
}