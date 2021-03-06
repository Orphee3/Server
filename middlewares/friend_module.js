var _ = require('lodash');
var nconf = require('nconf');
var redis = require('redis');
var errMod = require('./error_module');
var authorization = require('./authorization_module');
var Q = require('q');
var utilities = require('./utilities_module');
var middleware;
var notifMiddleware;

if (nconf.get('db') === 'mongodb') {
    middleware = require('./users_middlewares');
    notifMiddleware = require('./notification_middlewares');
}
else if (nconf.get('db') === 'mysql') {
    middleware = require('./users_middlewares_mysql');
    notifMiddleware = require('./notification_middlewares_mysql');
}
else if (nconf.get('db') === 'rethink') {
    middleware = require('./rethink/users_rethink');
    notifMiddleware = require('./rethink/notification_rethink');
}

module.exports = function (server) {

    server.get('/api/askfriend/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        function (req, res, next) {
            utilities.useMiddleware(askFriend, req, res, next);
        }
    );

    server.get('/api/acceptfriend/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        function (req, res, next) {
            utilities.useMiddleware(acceptFriend, req, res, next);
        }
    );

    server.get('/api/removeFriend/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        validateId,
        checkIfFriend,
        removeFriend
    );

    function validateId(req, res, next) {
        middleware.getById(req)
            .then(function (data) {
                if (!data) return res.status(400).json('user does not exist');
                else {
                    req.target = data;
                    next();
                }
            })
            .catch(function (err) {
                return res.status(500).json(err);
            });
    }

    function checkIfFriend(req, res, next) {
        if (req.user.friends.indexOf(req.params.id) === -1) return res.status(400).json('not friend yet');
        else next();
    }

    function removeFriend(req, res) {
        var index = req.user.friends.indexOf(req.params.id);
        req.user.friends.splice(index, 1);
        var indexT = req.target.friends.indexOf(req.user._id);
        if (indexT >= 0) req.target.friends.splice(indexT, 1);

        Q.all([
            middleware.update({rdb: req.rdb, params: {id: req.user._id}, body: {friends: req.user.friends}}),
            middleware.update({rdb: req.rdb, params: {id: req.params.id}, body: {friends: req.target.friends}})
        ]).spread(function () {
            return res.status(200).json('delete friend ok');
        }).catch(function (err) {
            return res.status(500).json(err);
        });
    }

    function sendInvitation(req, source, target, deferred) {

        notifMiddleware.create({type: 'friend', userSource: source._id}, req)
            .then(getUserNews)
            .spread(updateTarget)
            .spread(getUserSource)
            .spread(publish)
            .catch(function (err) {
                deferred.reject(errMod.getError(err, 500));
            });

        function getUserNews(n) {
            return [
                n,
                middleware.getNews(mockReq(req, {params: {id: target._id}, query: {offset: 0}}))
            ];
        }

        function updateTarget(n, news) {
            var listNews = _(news).pluck('_id').unshift(n._id).value();
            return [
                n,
                middleware.update(mockReq(req, {params: {id: target._id}, body: {news: listNews}}))
            ]
        }

        function getUserSource(n) {
            return [
                n,
                middleware.getById(mockReq(req, {params: {id: n.userSource, projection: 'name picture dateCreation'}}))
            ];
        }

        function publish(n, u) {
            var pub = redis.createClient();
            pub.publish(target._id, JSON.stringify({
                type: n.type,
                userSource: u,
                dateCreation: n.dateCreation
            }));
            pub.quit();
            deferred.resolve('ask friend ok');
        }
    }

    function acceptAndNotify(req, source, target, usFriends, utFriends, news, deffered) {
        var listUSourceId = _(usFriends).pluck('_id').push(target._id).value();
        var listUTargetId = _(utFriends).pluck('_id').push(source._id).value();

        var createNotification = [
            news,
            notifMiddleware.create({type: 'newFriend', userSource: target._id}, req),
            notifMiddleware.create({type: 'newFriend', userSource: source._id}, req),
            middleware.getNews(mockReq(req, {params: {id: source._id}, query: {offset: 0}})),
            middleware.getNews(mockReq(req, {params: {id: target._id}, query: {offset: 0}})),
            middleware.update(mockReq(req, {params: {id: source._id}, body: {friends: listUSourceId}})),
            middleware.update(mockReq(req, {params: {id: target._id}, body: {friends: listUTargetId}}))
        ];
        Q.all(createNotification)
            .spread(updateUsers)
            .spread(getUsers)
            .spread(sendMessages)
            .catch(function (err) {
                deffered.reject(errMod.getError(err, 500));
            });

        function updateUsers(news, nSource, nTarget, userSourceNews, userTargetNews) {
            var sourceListNews = _(userSourceNews).pluck('_id').unshift(nSource._id).value();
            var targetListNews = _(userTargetNews).pluck('_id').unshift(nTarget._id).value();

            var id = _.findIndex(targetListNews, function (chr) {
                return JSON.stringify(chr) === JSON.stringify(news[0]._id);
            });

            if (id > -1) {
                targetListNews.splice(id, 1);
            }
            return [
                nSource,
                nTarget,
                middleware.update(mockReq(req, {params: {id: source._id}, body: {news: sourceListNews}})),
                middleware.update(mockReq(req, {params: {id: target._id}, body: {news: targetListNews}}))
            ];
        }

        function getUsers(nSource, nTarget) {
            return [
                nSource,
                nTarget,
                middleware.getById(mockReq(req, {
                    params: {
                        id: nSource.userSource,
                        projection: 'name picture dateCreation'
                    }
                })),
                middleware.getById(mockReq(req, {
                    params: {
                        id: nTarget.userSource,
                        projection: 'name picture dateCreation'
                    }
                }))
            ];
        }

        function sendMessages(nSource, nTarget, us, ut) {
            var pub = redis.createClient();

            pub.publish(source._id, JSON.stringify({
                type: nSource.type,
                userSource: us
            }));
            pub.publish(target._id, JSON.stringify({
                type: nTarget.type,
                userSource: ut
            }));
            pub.quit();
            deffered.resolve('ok');
        }
    }

    function handleFriendRequest(req, source, target, type) {
        var deferred = Q.defer();

        var getUsers = [
            middleware.getById(mockReq(req, {params: {id: target}})),
            middleware.getById(mockReq(req, {params: {id: source}}))
        ];
        Q.all(getUsers)
            .spread(getUsersFriends)
            .spread(CheckIfFriends)
            .spread(sendOrAcceptRequest)
            .catch(function (err) {
                deferred.reject(errMod.getError(err, 500));
            });
        return deferred.promise;

        function getUsersFriends(usertarget, usersource) {
            return [
                usertarget,
                usersource,
                middleware.getFriends(mockReq(req, {params: {id: usertarget._id}})),
                middleware.getFriends(mockReq(req, {params: {id: usersource._id}}))
            ];
        }

        function CheckIfFriends(usertarget, usersource, utFriends, usFriends) {
            if (utFriends && usFriends
                && _.findIndex(utFriends, predicate.bind(null, usersource._id)) > -1
                && _.findIndex(usFriends, predicate.bind(null, usertarget._id)) > -1) {
                deferred.resolve('already friend');
            } else {
                return [
                    middleware.getNews(mockReq(req, {
                        params: {id: usertarget._id},
                        query: {offset: 0}
                    })),
                    usersource, usertarget, usFriends, utFriends
                ];
            }
            function predicate(idMatched, friend) {
                return JSON.stringify(friend._id) === JSON.stringify(idMatched);
            }
        }

        function sendOrAcceptRequest(targetnews, usersource, usertarget, usfriends, utfriends) {
            if (!targetnews) targetnews = [];
            var alreadySend = targetnews.filter(predicate);
            if (alreadySend.length > 0) {
                if (type === 'ask') deferred.resolve('already send');
                else acceptAndNotify(req, usersource, usertarget, usfriends, utfriends, alreadySend, deferred);
            } else {
                if (type === 'ask') sendInvitation(req, usersource, usertarget, deferred);
                else deferred.resolve('no friend invitation');
            }
            function predicate(n) {
                if (nconf.get('db') === 'mysql') {
                    return n.type === 'friend' && JSON.stringify(n.userSource) === JSON.stringify(usersource._id);
                } else {
                    return n.type === 'friend' && JSON.stringify(n.userSource._id) === JSON.stringify(usersource._id);
                }
            }
        }
    }

    function mockReq(req, obj) {
        if (req.mysql)
            obj.mysql = req.mysql;
        else if (req.rdb)
            obj.rdb = req.rdb;
        return obj;
    }

    function askFriend(req, res, next) {
        var source = req.user._id;
        var target = req.params.id;
        return handleFriendRequest(req, source, target, 'ask');
    }

    function acceptFriend(req, res, next) {
        var source = req.params.id;
        var target = req.user._id;
        return handleFriendRequest(req, source, target);
    }
};
