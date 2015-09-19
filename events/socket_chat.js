/**
 * Created by superphung on 8/17/15.
 */

var redis = require('redis');
var e = require('./socket_error');
var Q = require('q');
var nconf = require('nconf');

var User, Room, Message;

if (nconf.get('db') === 'mongodb') {
    User = require('../middlewares/users_middlewares');
    Room = require('../middlewares/room_middlewares');
    Message = require('../middlewares/message_middlewares');
} else if (nconf.get('db') === 'rethink') {
    User = require('../middlewares/rethink/users_rethink');
    Room = require('../middlewares/rethink/room_rethink');
    Message = require('../middlewares/rethink/message_rethink');
}

exports.onPrivateMessage = onPrivateMessage;
exports.onGroupMessage = onGroupMessage;
exports.onCreateChatGroup = onCreateChatGroup;

function onCreateChatGroup(socket, data) {
    if (!data.people)
        return e.error(socket, 'missing params');
    var createChatGroup = [
        Room.create({body: {people: [socket.request.user._id], peopleTmp: data.people}})
    ];
    Q.all(createChatGroup)
        .spread(addRoomToUser)
        .spread(sendMessage.bind(null, socket))
        .catch(function (err) {
            return e.error(socket, err);
        });

    function addRoomToUser(room) {
        if (!room) throw 'failed create room';
        return [
            room,
            User.updateRef({params: {id: socket.request.user._id}, body: {rooms: room._id}})
        ];
    }

    function sendMessage(socket, room) {
        var pub = redis.createClient();
        pub.publish(socket.request.user._id, JSON.stringify({
            type: 'create chat group',
            room: room
        }));
        pub.quit();
    }
}

function onGroupMessage(socket, data) {
    if (!data.to || !data.message)
        return e.error(socket, 'missing params');
    var getRoomAndCreateMessage = [
        Room.getById({params: {id: data.to}}),
        Message.create({body: {creator: socket.request.user._id, message: data.message}})
    ];
    Q.all(getRoomAndCreateMessage)
        .spread(updateRoomAndUsers.bind(null, socket))
        .spread(sendMessage)
        .catch(function (err) {
            return e.error(socket, err);
        });

    function updateRoomAndUsers(socket, room, message) {
        var roomMessages = room.messages;
        roomMessages.unshift(message._id);

        room.people.push.apply(room.people, room.peopleTmp);
        var promises = [
            message,
            User.getById({params: {id: socket.request.user._id}}),
            Room.update({params: {id: room._id}, body: {people: room.people, peopleTmp: [], messages: roomMessages, lastMessageDate: message.dateCreation}})
        ];
        room.peopleTmp.forEach(function (user) {
            promises.push(User.updateRef({params: {id: user}, body: {rooms: room._id}}));
        });
        return promises;
    }

    function sendMessage(message, source, room) {
        var pub = redis.createClient();
        room.people.forEach(function (user) {
            if (JSON.stringify(user) != JSON.stringify(source._id)) {
                pub.publish(user, JSON.stringify({
                    type: 'group message',
                    source: source,
                    target: room._id,
                    message: {
                        message: message.message,
                        dateCreation: message.dateCreation,
                        creator: {
                            name: source.name,
                            picture: source.picture
                        }
                    }
                }));
            }
        });
        pub.quit();
    }
}

function onPrivateMessage(socket, data) {
    var req = socket.request;
    if (!data.to || !data.message)
        return e.error(socket, 'missing params');
    var getUsers = [
        User.getById({rdb: req.rdb, params: {id: socket.request.user._id}}),
        User.getById({rdb: req.rdb, params: {id: data.to}})
    ];
    Q.all(getUsers)
        .spread(getRoomAndMessage.bind(null, data.message))
        .spread(updateRoomWithMessage)
        .spread(sendMessage)
        .catch(function (err) {
            return e.error(socket, err);
        });

    function getRoomAndMessage(message, uSource, uTarget) {
        if (!uSource || !uTarget) throw 'user no longer exist';
        return [
            uSource,
            uTarget,
            Room.findByNameOrCreate(socket.request.user._id, data.to, {rdb: req.rdb}),
            Message.create({rdb: req.rdb, body: {creator: uSource._id, message: message}})
        ];
    }

    function updateRoomWithMessage(uSource, uTarget, room, message) {
        var roomMessages = room.messages;
        roomMessages.unshift(message._id);
        return [
            uSource,
            uTarget,
            message,
            Room.update({rdb: req.rdb, params: {id: room._id}, body: {messages: roomMessages, lastMessageDate: message.dateCreation}})
        ];
    }

    function sendMessage(uSource, uTarget, message) {
        var pub = redis.createClient();
        pub.publish(uTarget._id, JSON.stringify({
            type: 'private message',
            source: uSource,
            target: uTarget,
            message: {
                message: message.message,
                dateCreation: message.dateCreation,
                creator: {
                    name: uSource.name,
                    picture: uSource.picture
                }
            }
        }));
        pub.quit();
    }
}