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

    function acceptAndNotify(source, target, usFriends, utFriends, news, deferred) {
        var listUSourceId = usFriends.map(function (friend) {
                return friend._id
            }),
            listUTargetId = utFriends.map(function (friend) {
                return friend._id
            });
        listUSourceId.push(target._id);
        listUTargetId.push(source._id);
        Q.all([
            notifMiddleware.create({type: 'newFriend', userSource: target}),//create notification for user source
            notifMiddleware.create({type: 'newFriend', userSource: source}),//create notification for user target
            middleware.update({params: {id: source._id}, body: {friends: listUSourceId}}),//update source friend list
            middleware.update({params: {id: target._id}, body: {friends: listUTargetId}}),//update target friend list
            notifMiddleware.delete(news[0]._id)//delete notification ask friend
        ]).spread(function (nSource, nTarget) {
            source.news.unshift(nSource._id);
            target.news.unshift(nTarget._id);
            return [
                nSource,
                nTarget,
                middleware.update({params: {id: source._id}, body: {news: source.news}}), //add news for user source
                middleware.update({params: {id: target._id}, body: {news: target.news}}) //add news for user target
            ];
        }).spread(function (nSource, nTarget) {
            var redisPub = redis.createClient();
            redisPub.publish(source._id, JSON.stringify(nSource)); //notify user in real time
            redisPub.publish(target._id, JSON.stringify(nTarget)); //notify user in real time
            redisPub.quit();
            deferred.resolve('ok');
        }).catch(function (err) {
            deferred.reject(errMod.getError(err, 500));
        });
    }

    function handleFriendRequest(source, target, type) {
        var deferred = Q.defer();
        Q.all([
            middleware.getById({params: {id: target}}),
            middleware.getById({params: {id: source}})
        ]).spread(function (usertarget, usersource) {
            return [
                usertarget,
                usersource,
                middleware.getFriends({params: {id: usertarget._id}}),
                middleware.getFriends({params: {id: usersource._id}})
            ];
        }).spread(function (usertarget, usersource, utFriends, usFriends) {
            var l1 = utFriends.filter(function (friend) {
                return JSON.stringify(friend._id) === JSON.stringify(usersource._id);
            });
            var l2 = usFriends.filter(function (friend) {
                return JSON.stringify(friend._id) === JSON.stringify(usertarget._id);
            });
            if (l1.length > 0 && l2.length > 0) {
                deferred.resolve('already friend');
            } else {
                return [middleware.getNews({
                    params: {id: usertarget._id},
                    query: {offset: 0}
                }), usersource, usertarget, usFriends, utFriends]
            }
        }).spread(function (targetnews, usersource, usertarget, usfriends, utfriends) {
            var alreadySend = targetnews.filter(function (n) {
                return n.type === 'friend' && JSON.stringify(n.userSource[0]._id) === JSON.stringify(usersource._id);
            });
            if (alreadySend.length > 0) {
                if (type === 'ask') deferred.resolve('already send');
                else acceptAndNotify(usersource, usertarget, usfriends, utfriends, alreadySend, deferred);
            } else {
                if (type === 'ask') sendInvitation(usersource, usertarget, deferred);
                else deferred.resolve('no friend invitation');
            }
        }).catch(function (err) {
            deferred.reject(errMod.getError(err, 500));
        });
        return deferred.promise;
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
