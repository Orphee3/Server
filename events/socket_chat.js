/**
 * Created by superphung on 8/17/15.
 */

var User = require('../middlewares/users_middlewares');
var Room = require('../middlewares/room_middlewares');
var Message = require('../middlewares/message_middlewares');

var redis = require('redis');
var e = require('./socket_error');
var Q = require('q');

exports.onPrivateMessage = onPrivateMessage;

function onPrivateMessage(socket, data) {
    if (!data.to || !data.message)
        return e.error(socket, 'missing params');
    var getUsers = [
        User.getById({params: {id: socket.request.user._id}}),
        User.getById({params: {id: data.to}})
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
            Room.findByNameOrCreate(socket.request.user._id, data.to),
            Message.create({body: {creator: uSource._id, message: message}})
        ];
    }

    function updateRoomWithMessage(uSource, uTarget, room, message) {
        var roomMessages = room.messages;
        roomMessages.unshift(message._id);
        return [
            uSource,
            uTarget,
            message,
            Room.update({params: {id: room._id}, body: {messages: roomMessages, lastMessageDate: message.dateCreation}})
        ];
    }

    function sendMessage(uSource, uTarget, message) {
        var pub = redis.createClient();
        pub.publish(uTarget._id, JSON.stringify({
            type: 'private message',
            source: uSource,
            target: uTarget,
            message: message
        }));
        pub.quit();
    }
}