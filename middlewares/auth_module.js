/**
 * Created by Eric on 08/04/2015.
 */

var Model = require('../models/data_models');
var bcrypt = require('bcrypt-nodejs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var jwt = require('jsonwebtoken');
var user_middleware;
var nconf = require('nconf');
var errMod = require('./error_module');
if (nconf.get('db') === 'mongodb') user_middleware = require('./users_middlewares');
else if (nconf.get('db') === 'mysql') user_middleware = require('./users_middlewares_mysql');

var SALT_WORK_FACTOR = 10;

module.exports = function (server) {
    Model.User.schema.pre('save', function (next) {
        var user = this;

        if (!user.isModified('password')) return next();
        bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
            if (err) return next(err);

            bcrypt.hash(user.password, salt, null, function (err, hash) {
                if (err) return next(err);
                user.password = hash;
                next();
            });
        });
    });

    var comparePassword = function (user, candidatePassword, callback) {
        bcrypt.compare(candidatePassword, user.password, function (err, isMatch) {
            if (err) return callback(err);
            callback(null, isMatch);
        });
    };

    function createSocialAccount(req, credentials, done) {
        if (credentials.social === 'local') return done(null, false, {message: 'Incorrect username.'});
        req.body.username = credentials.username;
        req.body.password = credentials.password;
        req.body[credentials.social + 'Id'] = credentials.username;
        req.body[credentials.social + 'Token'] = credentials.password;
        user_middleware.create(req)
            .then(function(data) {
                return done(null, data);
            })
            .catch(function(err) {
                if (err.status === 409) return done(null, false, {message: err.message});
                return done(err);
            })
            .done();
    }

    function loginMysql(req, credentials, done) {
        req.mysql.getConnection(function (err, connection) {
            if (err) done(err);
            var customQuery = 'SELECT * FROM users WHERE ' + credentials.index + '=?';
            connection.query(customQuery, credentials.username, function (err, rows) {
                if (err) done(err);
                else {
                    if (rows.length > 0) {
                        comparePassword(rows[0], credentials.password, function (err, isMatch) {
                            if (err)
                                return done(err);
                            if (isMatch)
                                return done(null, rows[0]);
                            else
                                return done(null, false, {message: 'Invalid password.'});
                        });
                    }
                    else
                        createSocialAccount(req, credentials, done);
                }
                connection.release();
            });
        });
    }

    function loginMongodb(req, credentials, done) {
        Model.User.findOne()
            .where(credentials.index).equals(credentials.username)
            .select('+password')
            .exec(function (err, user) {
                if (err) return done(err);
                if (user) {
                    comparePassword(user, credentials.password, function(err, isMatch) {
                        if (err)
                            return done(err);
                        if (isMatch)
                            return done(null, user);
                        return done(null, false, {message: 'Invalid password'});
                    });
                }
                else
                    createSocialAccount(req, credentials, done);
            });
    }

    function getCredentials(token) {
        var tokenDecoded = new Buffer(token, 'base64').toString();
        var tokenSplit = tokenDecoded.split(':');
        if (tokenSplit.length == 3) {
            if (!/^fb$/i.test(tokenSplit[2]) && !/^google$/i.test(tokenSplit[2]) && !/^local$/i.test(tokenSplit[2]))
                return {format: 0};
            var index;
            if (tokenSplit[2] == 'fb')
                index = 'fbId';
            else if (tokenSplit[2] == 'google')
                index = 'googleId';
            else
                index = 'username';
            return {username: tokenSplit[0], password: tokenSplit[1], social: tokenSplit[2], index: index, format: 1};
        }
        return {format: 0};
    }

    passport.use('bearer-login', new BearerStrategy({
        passReqToCallback: true
    }, function(req, token, done) {
        var credentials = getCredentials(token);
        if (!credentials.format)
            return done(null, false);
        if (nconf.get('db') === 'mongodb')
            loginMongodb(req, credentials, done);
        else if (nconf.get('db') === 'mysql')
            loginMysql(req, credentials, done);
    }));

    passport.use('local-register', new LocalStrategy({
        passReqToCallback: true
    }, function (req, username, password, done) {
        user_middleware.create(req)
            .then(function (data) {
                return done(null, data);
            })
            .catch(function (err) {
                if (err.status === 409) return done(null, false, {message: err.message});
                return done(err);
            })
            .done();
    }));

    server.use(passport.initialize());

    server.post('/api/login',
        passport.authenticate('bearer-login', {session: false}),
        function(req, res) {
            var token = jwt.sign(req.user, nconf.get('secret'), {expiresInMinutes: 1440});
            return res.status(200).json({token: token});
        });

    server.post('/api/register', function (req, res, next) {
        authUserAndGetToken('local-register', req, res, next);
    });

    function authUserAndGetToken(strategy, req, res, next) {
        passport.authenticate(strategy, function (err, user, info) {
            if (err) return next(err);
            if (!user) {
                //if (strategy === 'bearer') return res.status(401).json(info.message);
                if (strategy === 'local-register') return res.status(409).json(info.message);
            }
            req.logIn(user, {session: false}, function (err) {
                if (err) return next(err);
            });
            var token = jwt.sign(user, nconf.get('secret'), {expiresInMinutes: 1440});
            return res.status(200).json({token: token});
        })(req, res, next);
    }
};