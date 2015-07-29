var nconf = require('nconf');
var redis = require('redis');
var errMod = require('./error_module');
var jwt = require('express-jwt');
var Q = require('q');
var utilities = require('./utilities_module');
var middleware;

if (nconf.get('db') === 'mongodb')
    middleware = require('./users_middlewares');
else if (nconf.get('db') === 'mysql')
    middleware = require('./users_middlewares_mysql');

module.exports = function (server) {

    server.get('/api/askfriend/:id',
        jwt({secret: nconf.get('secret')}),
        function (req, res, next) {
            utilities.useMiddleware(askFriend, req, res, next);
        });

    server.get('/api/acceptfriend/:id',
        jwt({secret: nconf.get('secret')}),
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
        sendMessage(req.params.id, {type: 'friend', typeId: req.user._id}, redisPub, redisQuery, deferred);
        redisPub.quit();
        redisQuery.quit();
        deferred.resolve('ask friend ok');
    }

    function notifyFriendRequest(req, res, redisPub, redisQuery, deferred) {
        Q.all([
            middleware.getById({params: {id: req.params.id}}, res),
            middleware.getById({params: {id: req.user._id}}, res)
        ]).spread(function (user1, user2) {
            if (user1.friends.indexOf(req.user._id) != -1 && user2.friends.indexOf(req.params.id) != -1)
                return deferred.resolve('already friend');
            var user1friendList = user1.friends;
            var user2friendList = user2.friends;
            user1friendList.push(req.user._id);
            user2friendList.push(req.params.id);
            return Q.all([
                middleware.update({params: {id: req.params.id}, body: {friends: user1friendList}}, res),
                middleware.update({params: {id: req.user._id}, body: {friends: user2friendList}}, res)
            ]);
        }).spread(function () {
            sendMessage(req.params.id, {type: 'newFriend', typeId: req.user._id}, redisPub, redisQuery);
            sendMessage(req.user._id, {type: 'newFriend', typeId: req.params.id}, redisPub, redisQuery);
            redisPub.quit();
            redisQuery.quit();
            deferred.resolve('ok');
        }).catch(function (err) {return deferred.reject(err);});
    }

    function friendParse(req, res, deferred, targetId, sourceId, notifyFunc, type) {
        var redisPub = redis.createClient();
        var redisQuery = redis.createClient();

        middleware.getById(req, res)
            .then(function (data) {
                redisQuery.lrange(targetId, 0, -1, function (err, news) {
                    if (err)
                        deferred.reject(errMod.getError(err, 500));
                    else if (news.length != 0) {
                        var elem = news.map(JSON.parse);
                        for (var i = 0; i < news.length; i++) {
                            if (elem[i].type === 'friend' && elem[i].typeId === sourceId) {
                                if (type === 'ask')
                                    deferred.resolve('already send');
                                else
                                    return notifyFunc(req, res, redisPub, redisQuery, deferred);
                            }
                        }
                    } else {
                        if (type === 'ask')
                            return notifyFunc(req, res, redisPub, redisQuery, deferred);
                        else
                            deferred.resolve('no friend invitation');
                    }
                });
            })
            .catch(function (err) {deferred.reject(err);});
        return deferred.promise;
    }

    function askFriend(req, res, next) {
        var deferred = Q.defer();
        return friendParse(req, res, deferred, req.params.id, req.user._id, sendInvitation, 'ask');
    }

    function acceptFriend(req, res, next) {
        var deferred = Q.defer();
        return friendParse(req, res, deferred, req.user._id, req.params.id, notifyFriendRequest, 'reply');
    }
};
