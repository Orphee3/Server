/**
 * Created by superphung on 8/16/15.
 */

var fs = require('fs');
var nconf = require('nconf');
var jwt = require('jwt-simple');
var redis = require('redis');
var pub = redis.createClient();
var sub = redis.createClient();

module.exports = Notification;

function Notification(io) {

    var actions = {};
    actions.validateToken = validateToken;
    actions.onSubscribe = onSubscribe;
    actions.onPrivateMessage = onPrivateMessage;
    actions.sendInfoToClient = sendInfoToClient;

    io.use(actions.validateToken);

    io.on('connection', function (socket) {
        console.log('client connected');
        socket.on('subscribe', actions.onSubscribe.bind(null, socket));
        socket.on('private message', actions.onPrivateMessage);
    });

    sub.on('message', actions.sendInfoToClient);

    function validateToken(socket, next) {
        var req = socket.request;
        if (req._query && req._query.token) {
            var token = req._query.token;
            try {
                jwt.decode(token, nconf.get('secret'));
            } catch (err) {
                return next(new Error('not authorized'));
            }
            return next();
        } else {
            return next(new Error('not authorized'))
        }
    }

    function onPrivateMessage(data) {

    }

    function onSubscribe(socket, data) {
        if (!data.channel)
            return error(socket, 'missing params : channel');
        var token = socket.handshake.query.token;
        try {
            var decoded = jwt.decode(token, nconf.get('secret'));
        } catch (err) {
            console.log('err jwt decode', err);
            return notAuthorized(socket);
        }
        if (data.channel != decoded.sub) {
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