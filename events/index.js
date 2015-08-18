/**
 * Created by superphung on 8/16/15.
 */

var fs = require('fs');
var nconf = require('nconf');
var jwt = require('jwt-simple');
var redis = require('redis');

var auth = require('./socket_auth');
var chat = require('./socket_chat');
var e = require('./socket_error');

var pub = redis.createClient();
var sub = redis.createClient();

module.exports = Notification;

function Notification(io) {

    var actions = {};
    actions.onSubscribe = onSubscribe;
    actions.sendInfoToClient = sendInfoToClient;

    io.use(auth.validateToken);

    io.on('connection', function (socket) {
        console.log('client connected');
        socket.on('subscribe', actions.onSubscribe.bind(null, socket));
        socket.on('private message', chat.onPrivateMessage.bind(null, socket));
    });

    sub.on('message', actions.sendInfoToClient);

    function onSubscribe(socket, data) {
        if (!data.channel)
            return e.error(socket, 'missing params : channel');
        if (data.channel != socket.request.user._id) {
            console.log('error id');
            return e.notAuthorized(socket);
        }
        socket.join(data.channel);
        sub.subscribe(data.channel);
        console.log('subscribe ok');
    }

    function sendInfoToClient(channel, data) {
        //var res = {channel: channel, news: JSON.parse(data)};
        if (JSON.stringify(data.type) === 'private message')
            io.sockets.in(channel).emit(data.type, JSON.parse(data));
        else
            io.sockets.in(channel).emit('message', JSON.parse(data));
    }
}