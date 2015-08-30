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

    function sendInvitation(source, target, deferred) {
        notifMiddleware.create({type: 'friend', userSource: source})
            .then(function (n) {
                target.news.unshift(n._id);
                target.save(function (err) {
                    if (err) throw err;
                    else {
                        var redisPub = redis.createClient();
                        redisPub.publish(target._id, JSON.stringify(n));
                        redisPub.quit();
                        deferred.resolve('ask friend ok');
                    }
                });
            })
            .catch(function (err) {
                deferred.reject(errMod.getError(err, 500));
            });
    }

    function acceptAndNotify(source, target, usFriends, utFriends, news, deffered) {
        var listUSourceId = _(usFriends).pluck('_id').push(target._id).value();
        var listUTargetId = _(utFriends).pluck('_id').push(source._id).value();
        console.log('listUSourceId', listUSourceId);
        console.log('listUTargetId', listUTargetId);
        var createNotification = [
            notifMiddleware.create({type: 'newFriend', userSource: target}),
            notifMiddleware.create({type: 'newFriend', userSource: source}),
            middleware.update({params: {id: source._id}, body: {friends: listUSourceId}}),
            middleware.update({params: {id: target._id}, body: {friends: listUTargetId}}),
            notifMiddleware.delete(news[0]._id)
        ];
        Q.all(createNotification)
            .spread(updateUsers)
            .spread(sendMessage)
            .catch(function (err) {
                deffered.reject(errMod.getError(err, 500));
            });

        function updateUsers(nSource, nTarget) {
            source.news.unshift(nSource._id);
            target.news.unshift(nTarget._id);
            return [
                nSource,
                nTarget,
                middleware.update({params: {id: source._id}, body: {news: source.news}}),
                middleware.update({params: {id: target._id}, body: {news: target.news}})
            ];
        }

        function sendMessage(nSource, nTarget) {
            var pub = redis.createClient();
            pub.publish(source._id, JSON.stringify(nSource));
            pub.publish(target._id, JSON.stringify(nTarget));
            pub.quit();
            deffered.resolve('ok');
        }
    }

    function handleFriendRequest(source, target, type) {
        var deferred = Q.defer();

        var getUsers = [
            middleware.getById({params: {id: target}}),
            middleware.getById({params: {id: source}})
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
                middleware.getFriends({params: {id: usertarget._id}}),
                middleware.getFriends({params: {id: usersource._id}})
            ];
        }

        function CheckIfFriends(usertarget, usersource, utFriends, usFriends) {
            if (_.findIndex(utFriends, predicate.bind(null, usersource._id)) > -1
                && _.findIndex(usFriends, predicate.bind(null, usertarget._id)) > -1) {
                deferred.resolve('already friend');
            } else {
                return [
                    middleware.getNews({
                        params: {id: usertarget._id},
                        query: {offset: 0}
                    }),
                    usersource, usertarget, usFriends, utFriends
                ];
            }
            function predicate(idMatched, friend) {
                return JSON.stringify(friend._id) === JSON.stringify(idMatched);
            }
        }

        function sendOrAcceptRequest(targetnews, usersource, usertarget, usfriends, utfriends) {
            var alreadySend = targetnews.filter(predicate);
            if (alreadySend.length > 0) {
                if (type === 'ask') deferred.resolve('already send');
                else acceptAndNotify(usersource, usertarget, usfriends, utfriends, alreadySend, deferred);
            } else {
                if (type === 'ask') sendInvitation(usersource, usertarget, deferred);
                else deferred.resolve('no friend invitation');
            }
            function predicate(n) {
                return n.type === 'friend' && JSON.stringify(n.userSource[0]._id) === JSON.stringify(usersource._id);
            }
        }
    }

    function askFriend(req, res, next) {
        var source = req.user._id;
        var target = req.params.id;
        return handleFriendRequest(source, target, 'ask');
    }

    function acceptFriend(req, res, next) {
        var source = req.params.id;
        var target = req.user._id;
        return handleFriendRequest(source, target);
    }
};
