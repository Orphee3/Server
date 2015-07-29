var nconf = require('nconf');
var redis = require('redis');
var errMod = require('./error_module');
var jwt = require('express-jwt');
var Model = require('../models/data_models');
var async = require('async');
var middleware;

if (nconf.get('db') === 'mongodb')
    middleware = require('./users_middlewares');
else if (nconf.get('db') === 'mysql')
    middleware = require('./users_middlewares_mysql');

module.exports = function (server) {

    server.get('/api/askfriend/:id',
        jwt({secret: nconf.get('secret')}),
        askFriend);

    server.get('/api/acceptfriend/:id',
        jwt({secret: nconf.get('secret')}),
        acceptFriend);

    function sendMessage(idCandidate, obj, redisPub, redisQuery) {
        redisPub.publish(idCandidate, JSON.stringify(obj));
        redisQuery.rpush([idCandidate, JSON.stringify(obj)], function (err, reply) {
            if (err) return res.status(500).json(err);
        });
    }

    function sendInvitation(req, res, redisPub, redisQuery) {
        sendMessage(req.params.id, {type: 'friend', typeId: req.user._id}, redisPub, redisQuery);
        redisPub.quit();
        redisQuery.quit();
        return res.status(200).json('ask friend ok');
    }

    function notifyFriendRequest(req, res, redisPub, redisQuery) {

        async.parallel([
                function (callback) {
                    Model.User.findById(req.params.id, function (err, user) {
                        if (err) callback(err, null);
                        else callback(null, user);
                    });
                },
                function (callback) {
                    Model.User.findById(req.user._id, function (err, user) {
                        if (err) callback(err, null);
                        else callback(null, user);
                    });
                }
            ],
            function (err, results) {
                if (err) return res.status(500).json('user does not exist');
                else {
                    if (results[0].friends.indexOf(req.user._id) != -1 && results[1].friends.indexOf(req.params.id) != -1)
                        return res.status(200).json('already friend');
                    async.parallel([
                            function (callback) {
                                results[0].friends.push(req.user._id);
                                results[0].save(function (err, user) {
                                    if (err) callback(err, null);
                                    else callback(null, user);
                                });
                            },
                            function (callback) {
                                results[1].friends.push(req.params.id);
                                results[1].save(function (err, user) {
                                    if (err) callback(err, null);
                                    else callback(null, user);
                                });
                            }
                        ],
                        function (err, results) {
                            if (err) return res.status(500).json(err);
                            else {
                                sendMessage(req.params.id, {type: 'newFriend', typeId: req.user._id}, redisPub, redisQuery);
                                sendMessage(req.user._id, {type: 'newFriend', typeId: req.params.id}, redisPub, redisQuery);
                                redisPub.quit();
                                redisQuery.quit();
                                return res.status(200).json('ok');
                            }
                        });
                }
            });
    }

    function friendParse(req, res, next, targetId, sourceId, notifyFunc, type) {
        var redisPub = redis.createClient();
        var redisQuery = redis.createClient();
        middleware.getById(req, res)
            .then(function (data) {
                if (data != null) {
                    redisQuery.lrange(targetId, 0, -1, function (err, news) {
                        if (err) {
                            return next(errMod.getError(err, 500));
                        } else if (news.length != 0) {
                            var elem = news.map(JSON.parse);
                            for (var i = 0; i < news.length; i++) {
                                if (elem[i].type === 'friend' && elem[i].typeId === sourceId) {
                                    if (type === 'ask')
                                        return res.status(200).json('already send');
                                    return notifyFunc(req, res, redisPub, redisQuery);
                                }
                            }
                            if (type === 'ask')
                                return notifyFunc(req, res, redisPub, redisQuery);
                            return res.status(200).json('no friend invitation');
                        } else {
                            if (type === 'ask')
                                return notifyFunc(req, res, redisPub, redisQuery);
                            return res.status(200).json('no friend invitation');
                        }
                    });
                } else {
                    return next(errMod.getError('id does not exist', 400));
                }
            })
            .catch(function (err) {
                return next(errMod.getError(err, 500));
            });
    }

    function askFriend(req, res, next) {
        return friendParse(req, res, next, req.params.id, req.user._id, sendInvitation, 'ask');
    }

    function acceptFriend(req, res, next) {
        return friendParse(req, res, next, req.user._id, req.params.id, notifyFriendRequest, 'reply');
    }
};
