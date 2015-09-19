/**
 * Created by superphung on 8/7/15.
 */

var errMod = require('./error_module');
var jwt = require('jwt-simple');
var moment = require('moment');
var nconf = require('nconf');
var user_middleware;
if (nconf.get('db') === 'mongodb') user_middleware = require('./users_middlewares');
else if (nconf.get('db') === 'mysql') user_middleware = require('./users_middlewares_mysql');
else if (nconf.get('db') === 'rethink') user_middleware = require('./rethink/users_rethink');

exports.checkTokenExpiration = checkTokenExpiration;
exports.validateToken = validateToken;

function checkTokenExpiration(option) {

    return function (req, res, next) {
        if (!(req.headers && req.headers.authorization) || req.path == '/api/login')
            return next();
        var header = req.headers.authorization.split(' ');
        var decoded = jwt.decode(header[1], option.secret);
        var now = moment().unix();

        if (now > decoded.exp)
            return res.status(401).json('token has expired');
        else
            return next();
    };
}

function validateToken(option) {

    return function (req, res, next) {
        if (req.headers && req.headers.authorization) {
            var header = req.headers.authorization.split(' ');
            if (header.length == 2) {
                if (/^Bearer$/i.test(header[0])) {
                    var decoded = jwt.decode(header[1], option.secret);
                    user_middleware.getById(mockReq({rdb: req.rdb, params: {id: decoded.sub}}))
                        .then(function (user) {
                            if (!user)
                                return res.status(401).json('User no longer exist');
                            req.user = user;
                            next();
                        })
                        .catch(next);
                } else
                    return res.status(401).json('Format is Authorization: Bearer [token]');
            } else {
                return res.status(401).json('Format is Authorization: Bearer [token]');
            }
        } else {
            return res.status(401).json('No authorization token was found', 401);
        }
        function mockReq(obj) {
            if (nconf.get('db') === 'mysql') {
                obj.mysql = req.mysql;
            }
            return obj;
        }
    };
}