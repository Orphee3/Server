var nconf = require('nconf');
var redis = require('redis');
var errMod = require('./error_module');
var authorization = require('./authorization_module');
var Q = require('q');
var utilities = require('./utilities_module');
var middleware;

if (nconf.get('db') === 'mongodb')
    middleware = require('./users_middlewares');
else if (nconf.get('db') === 'mysql')
    middleware = require('./users_middlewares_mysql');

module.exports = function (server) {

    server.get('/api/askfriend/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        function (req, res, next) {
            utilities.useMiddleware(askFriend, req, res, next);
        });

    server.get('/api/acceptfriend/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        function (req, res, next) {
            utilities.useMiddleware(acceptFriend, req, res, next);
        });

    function sendMessage(idCandidate, obj, redisPub, redisQuery, deferred) {
        redisPub.publish(idCandidate, JSON.stringify(obj));
        redisQuery.rpush([idCandidate, JSON.stringify(obj)], function (err, reply) {
            if (err)
                deferred.reject(errMod.getError(err, 500));
        });
    }

    function sendInvitation(req, res, redisPub, redisQuery, deferred) {
        sendMessage(req.params.id, {type: 'friend', friend: req.user._id, date: new Date()}, redisPub, redisQuery, deferred);
        redisPub.quit();
        redisQuery.quit();
        deferred.resolve('ask friend ok');
    }

    function notifyFriendRequest(req, res, redisPub, redisQuery, deferred, obj) {
        obj.friendList1.push(req.user._id);
        obj.friendList2.push(req.params.id);
        Q.all([
            middleware.update({params: {id: req.params.id}, body: {friends: obj.friendList1}}, res),
            middleware.update({params: {id: req.user._id}, body: {friends: obj.friendList2}}, res)
        ]).spread(function () {
            sendMessage(req.params.id, {type: 'newFriend', friend: req.user._id, date: new Date()}, redisPub, redisQuery);
            sendMessage(req.user._id, {type: 'newFriend', friend: req.params.id, date: new Date()}, redisPub, redisQuery);
            redisQuery.lindex(req.user._id, obj.index, function (err , res) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
                else {
                    redisQuery.lrem(req.user._id, 0, res, function (err) {
                        if (err)
                            deferred.reject(errMod.getError(err, 500));
                        else {
                            redisPub.quit();
                            redisQuery.quit();
                            deferred.resolve('ok');
                        }
                    });
                }
            });
        }).catch(function (err) {deferred.reject(errMod.getError(err, 500));});
    }

    function friendParse(req, res, targetId, sourceId, notify, type) {
       var deferred = Q.defer();
        Q.all([
            middleware.getById({params: {id: req.params.id}}, res),
            middleware.getById({params: {id: req.user._id}}, res)
        ]).spread(function (user1, user2) {
            if (user1.friends.indexOf(req.user._id) != -1 && user2.friends.indexOf(req.params.id) != -1)
                deferred.resolve('already friend');
            else {
                var redisPub = redis.createClient();
                var redisQuery = redis.createClient();
                //check if already send invitation - ask invitation
                //check if have invitation - accept invitation
                redisQuery.lrange(targetId, 0, -1, function (err, news) {
                    if (err)
                        deferred.reject(errMod.getError(err, 500));
                    else if (news.length != 0) {
                        var elem = news.map(JSON.parse);
                        for (var i = 0; i < elem.length; i++) {
                            if (elem[i].type === 'friend' && elem[i].friend === sourceId) {
                                if (type === 'ask') deferred.resolve('already send');
                                else notify(req, res, redisPub, redisQuery, deferred, {
                                    index: i,
                                    friendList1: user1.friends,
                                    friendList2: user2.friends
                                });
                            }
                        }
                    } else {
                        if (type === 'ask') notify(req, res, redisPub, redisQuery, deferred);
                        else deferred.resolve('no friend invitation');
                    }
                });
            }
        }).catch(function (err) {deferred.reject(errMod.getError(err, 500));});
        return deferred.promise;
    }

    function askFriend(req, res, next) {
        return friendParse(req, res, req.params.id, req.user._id, sendInvitation, 'ask');
    }

    function acceptFriend(req, res, next) {
        return friendParse(req, res, req.user._id, req.params.id, notifyFriendRequest, 'reply');
    }
};
