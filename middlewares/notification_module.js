/**
 * Created by superphung on 7/22/15.
 */
var _ = require('lodash');
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
    notifMiddleware = require('./notification_middlewares_mysql');
}

module.exports = function (server) {
    server.get('/api/notify/:type/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        notify);

    function notify(req, res, next) {
        var types = ['likes', 'creations', 'comments'];
        if (types.indexOf(req.params.type) === -1)
            return res.status(400).json('Invalid type');
        Q.all([
            creationMiddleware.getById(mockReq({params: {id: req.params.id}}), res),
            userMiddleware.getFriends(mockReq({params: {id: req.user._id}}), res)
        ])
            .spread(createNotification)
            .spread(notifyFriends)
            .spread(notifyCreators)
            .catch(function (err) {
                if (err.status) return res.status(err.status).json(err.message);
                return res.status(500).json(err.message);
            });

        function createNotification(creation, friends) {
            if (!creation) throw errMod.getError('wrong id', 400);
            return [
                notifMiddleware.create(mockReq({type: req.params.type, media: creation._id, userSource: req.user._id}), req),
                friends
            ];
        }

        function notifyFriends(n, friends) {
            if (friends) {
                var promises = friends.map(function (friend) {
                    if (nconf.get('db') === 'mongodb') {
                        friend.flux.unshift(n);
                        return saveModel(friend);
                    } else if (nconf.get('db') === 'mysql') {
                        return userMiddleware.getFlux(mockReq({params: {id: friend._id}}))
                            .then(function (flux) {
                                var fluxId = _(flux).pluck('_id').unshift(n._id).value();
                                return userMiddleware.update(mockReq({params: {id: friend._id}, body: {flux: fluxId}}));
                            });
                    }
                });
                return Q.all(promises)
                    .then(function () {
                        return [n, creationMiddleware.getCreator(mockReq({params: {id: req.params.id}}))];
                    });
            } else {
                return [n, creationMiddleware.getCreator(mockReq({params: {id: req.params.id}}))];
            }
        }

        function notifyCreators(n, creators) {
            var redis = require('redis');
            var pub = redis.createClient();
            var promises = creators.map(function (creator) {
                return notifMiddleware.create(n, req)
                    .then(getCreatorNews.bind(null, creator))
                    .spread(updateCreatorNews.bind(null, creator))
                    .spread(getUserSourceAndMedia)
                    .spread(notifyCreator);
            });
            return Q.all(promises)
                .then(function () {
                    pub.quit();
                    res.status(200).json('notify ok');
                });

            function getCreatorNews(creator, newnotif) {
                return [newnotif, userMiddleware.getNews(mockReq({params: {id: creator._id}, query: {offset: 0}}))];
            }

            function updateCreatorNews(creator, newnotif, creatorNews) {
                var listNews = _(creatorNews).pluck('_id').unshift(newnotif._id).value();
                return [newnotif, userMiddleware.update(mockReq({params: {id: creator._id}, body: {news: listNews}}))];
            }

            function getUserSourceAndMedia(n, userUpdated) {
                return [
                    userUpdated,
                    n,
                    userMiddleware.getById(mockReq({params: {id: n.userSource, projection: 'name picture dateCreation'}})),
                    creationMiddleware.getById(mockReq({params: {id: n.media}}))
                ]
            }

            function notifyCreator(userUpdated, n, user, media) {
                pub.publish(userUpdated._id, JSON.stringify({
                    type: n.type,
                    media: media,
                    dateCreation: n.dateCreation,
                    userSource: user
                }));
            }
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

        function mockReq(obj) {
            if (nconf.get('db') === 'mysql') {
                obj.mysql = req.mysql;
            }
            return obj;
        }
    }
};