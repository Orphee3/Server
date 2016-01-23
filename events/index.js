/**
 * Created by superphung on 8/16/15.
 */

var fs = require('fs');
var nconf = require('nconf');
var jwt = require('jwt-simple');
var redis = require('redis');
var mysql = require('mysql');
var r = require('rethinkdb');

var auth = require('./socket_auth');
var chat = require('./socket_chat');
var game = require('./socket_game');
var e = require('./socket_error');

var pub = redis.createClient();
var sub = redis.createClient();

module.exports = Notification;

function Notification(io) {

    var actions = {};
    actions.onSubscribe = onSubscribe;
    actions.sendInfoToClient = sendInfoToClient;

    if (nconf.get('db') === 'mysql') {
        var pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: 'superphung',
            database: 'Orphee'
        });
        io.use(function (socket, next) {
            var req = socket.request;
            req.mysql = pool;
            next();
        });
    }

    if (nconf.get('db') === 'rethink') {
        io.use(function (socket, next) {
            var req = socket.request;
            r.connect({
                db: 'orphee'
            }).then(function (conn) {
                req.rdb = conn;
                next();
            });
        });
    }

    io.use(auth.validateToken);

    io.on('connection', function (socket) {
        console.log('client connected');
        socket.on('subscribe', actions.onSubscribe.bind(null, socket));
        socket.on('create chat group', chat.onCreateChatGroup.bind(null, socket));
        socket.on('group message', chat.onGroupMessage.bind(null, socket));
        socket.on('private message', chat.onPrivateMessage.bind(null, socket));

        socket.on('create game room', game.onCreateGameRoom.bind(null, socket));
        socket.on('get game rooms', game.onGetGameRooms.bind(null, socket));
        socket.on('join game room', game.onJoinGameRoom.bind(null, socket));
        socket.on('leave game room', game.onLeaveGameRoom.bind(null, socket));
        socket.on('kick user', game.onKickUser.bind(null, socket));
        socket.on('data game', game.onSendDataGame.bind(null, socket));
        socket.on('get all data game', game.onGetAllDataGame.bind(null, socket));
        socket.on('host send data', game.onGetDataFromHost.bind(null, socket));
        socket.on('big bang', game.onBigBang.bind(null, socket));
    });

    sub.on('message', actions.sendInfoToClient);

    function onSubscribe(socket, data) {
        if (!data.channel)
            return e.error(socket, 'missing params : channel');
        console.log('data.channel', data.channel);
        console.log('socket.request.user_id', socket.request.user._id);
        if (data.channel != socket.request.user._id) {
            console.log('error id');
            return e.notAuthorized(socket);
        }
        socket.join(data.channel);
        sub.subscribe(data.channel);
        console.log('subscribe ok');
    }

    function sendInfoToClient(channel, data) {
        console.log('send info to client emit !');
        var dataParsed = JSON.parse(data);
        io.sockets.in(channel).emit(dataParsed.type, dataParsed);
    }
}