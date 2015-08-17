/**
 * Created by superphung on 8/16/15.
 */

var fs = require('fs');
var nconf = require('nconf');
var jwt = require('jwt-simple');
var auth = require('./socket_auth');
var redis = require('redis');
var pub = redis.createClient();
var sub = redis.createClient();

module.exports = Notification;

function Notification(io) {

    var actions = {};
    actions.onSubscribe = onSubscribe;
    actions.onPrivateMessage = onPrivateMessage;
    actions.sendInfoToClient = sendInfoToClient;

    io.use(auth.validateToken);

    io.on('connection', function (socket) {
        console.log('client connected');
        socket.on('subscribe', actions.onSubscribe.bind(null, socket));
        socket.on('private message', actions.onPrivateMessage);
    });

    sub.on('message', actions.sendInfoToClient);

    function onPrivateMessage(data) {

    }

    function onSubscribe(socket, data) {
        if (!data.channel)
            return error(socket, 'missing params : channel');
        if (data.channel != socket.request.user._id) {
            console.log('error id');
            return notAuthorized(socket);
        }
        socket.join(data.channel);
        sub.subscribe(data.channel);
        console.log('subscribe ok');
    }

    function sendInfoToClient(channel, data) {
        var res = {channel: channel, news: JSON.parse(data)};
        io.sockets.in(channel).emit('message', res);
    }

    function notAuthorized(socket) {
        socket.emit('unauthorized');
        socket.disconnect();
    }

    function error(socket, err) {
        var e = new Error(err);
        socket.emit('error', e);
    }
}