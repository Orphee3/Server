/**
 * Created by superphung on 7/22/15.
 */
var errMod = require('./error_module');
var nconf = require('nconf');
var authorization = require('./authorization_module');
var Q = require('q');
var Model = require('../models/data_models');
var creationMiddleware;
var userMiddleware;
var notifMiddleware;

if (nconf.get('db') === 'mongodb') {
    creationMiddleware = require('./creations_middlewares');
    userMiddleware = require('./users_middlewares');
    notifMiddleware = require('./notification_middlewares');
}
else if (nconf.get('db') === 'mysql') {
    creationMiddleware = require('./creations_middlewares_mysql');
    userMiddleware = require('./users_middlewares_mysql');
}

module.exports = function (server) {
    //@todo mysql
    server.get('/api/notify/:type/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        notify);

    function notify(req, res, next) {
        var types = ['likes', 'creations', 'comments'];

        if (types.indexOf(req.params.type) === -1)
            return res.status(400).json('Invalid type');
        Q.all([
            creationMiddleware.getById({params: {id: req.params.id}}, res),
            userMiddleware.getFriends({params: {id: req.user._id}}, res)
        ]).spread(notifyFriends);

        function notifyFriends(creation, friends) {
            if (!creation) return res.status(400).json('wrong id');
            notifMiddleware.create({type: req.params.type, media: creation, userSource: req.user._id})
                .then(function (notif) {
                    for (var i = 0; i < friends.length; i++) {
                        friends[i].flux.unshift(notif);
                        saveModel(friends[i]).then()
                            .catch(function (err) {
                                return res.status(500).json(err.message);
                            });
                    }
                    return [notif, creationMiddleware.getCreator({params: {id: req.params.id}})];
                })
                .spread(notifyCreator)
                .catch(function (err) {
                    return res.status(500).json(err.message);
                });
        }

        function notifyCreator(notif, creators) {
            var redis = require('redis');

            creators.forEach(function (creator) {
                notifMiddleware.create(notif)
                    .then(function (newnotif) {
                        creator.news.unshift(newnotif._id);
                        return [newnotif, saveModel(creator)];
                    })
                    .spread(function (n, userUpdated) {
                        var redisPub = redis.createClient();
                        redisPub.publish(userUpdated._id, JSON.stringify(n));
                        redisPub.quit();
                    })
                    .catch(function (err) {
                        return res.status(500).json(err.message);
                    });
            });
            return res.status(200).json('notify ok');
        }

        function saveModel(obj) {
            var deferred = Q.defer();

            obj.save(function (err) {
                if (err)
                    deferred.reject(errMod.getError(err, 500));
                else
                    deferred.resolve(obj);
            });
            return deferred.promise;
        }
    }
};