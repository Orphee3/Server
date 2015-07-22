/**
 * Created by superphung on 7/22/15.
 */
var errMod = require('./error_module');
var nconf = require('nconf');
var jwt = require('express-jwt');

module.exports = function (server) {
    server.get('/api/notify/:type/:id',
        jwt({secret: nconf.get('secret')}),
        function (req, res, next) {
            var type = req.params.type;

            var match = type.match(/^likes|creations|comments$/);
            if (match)
                type = match[0];
            else
                return next(errMod.getError('Invalid type', 400));
            if (req.user[type].indexOf(req.params.id) >= 0) {
                if (req.user.friends.length > 0) {
                    var redis = require('redis'),
                        redisPub = redis.createClient(),
                        redisQuery = redis.createClient();
                    for (var i = 0; i < req.user.friends.length; i++) {
                        var obj = {type: type, typeId: req.params.id, friend: req.user._id, date: new Date()};
                        redisPub.publish(req.user.friends[i], JSON.stringify(obj));
                        redisQuery.rpush([req.user.friends[i], JSON.stringify(obj)], function (err, reply) {
                            if (err) next(errMod.getError(err, 500));
                        });
                    }
                    redisPub.quit();
                    redisQuery.quit();
                }
                return res.status(200).json('notify ok');
            }
            else
                return next(errMod.getError('Wrong id', 400));
        });
};