/**
 * Created by Eric on 08/04/2015.
 */

var Model = require('../models/data_models');
var bcrypt = require('bcrypt-nodejs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var jwt = require('jsonwebtoken');
var user_middleware;
var nconf = require('nconf');
if (nconf.get('db') === 'mongodb') user_middleware = require('./users_middlewares');
else if (nconf.get('db') === 'mysql') user_middleware = require('./users_middlewares_mysql');

var SALT_WORK_FACTOR = 10;
var SECRET = 'superphung';

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

    function loginMysql(req, username, password, done) {
        req.mysql.getConnection(function (err, connection) {
            if (err) done(err);
            connection.query('SELECT * FROM users WHERE username=?', username, function (err, rows) {
                if (err) done(err);
                else {
                    if (rows.length === 0)
                        return done(null, false, {message: 'Incorrect username.'});
                    comparePassword(rows[0], password, function (err, isMatch) {
                        if (err)
                            return done(err);
                        if (isMatch)
                            return done(null, rows[0]);
                        else
                            return done(null, false, {message: 'Invalid password.'});
                    });
                }
                connection.release();
            });
        });
    }

    function loginMongodb(req, username, password, done) {
        Model.User.findOne({username: username})
            .select('+password')
            .exec(function (err, user) {
                if (err) return done(err);
                if (!user) return done(null, false, {message: 'Incorrect username.'});
                comparePassword(user, password, function (err, isMatch) {
                    if (err)
                        return done(err);
                    if (isMatch)
                        return done(null, user);
                    else
                        return done(null, false, {message: 'Invalid password.'});
                });
            });
    }

    passport.use('local-login', new LocalStrategy({
        passReqToCallback: true
    },function (req, username, password, done) {
        if (nconf.get('db') === 'mongodb')
            loginMongodb(req, username, password, done);
        else if (nconf.get('db') === 'mysql')
            loginMysql(req, username, password, done);
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

    server.post('/login', function (req, res, next) {
        authUserAndGetToken('local-login', req, res, next);
    });

    server.post('/register', function (req, res, next) {
        authUserAndGetToken('local-register', req, res, next);
    });

    function authUserAndGetToken(strategy, req, res, next) {
        passport.authenticate(strategy, function (err, user, info) {
            if (err) return next(err);
            if (!user) {
                if (strategy === 'local-login') return res.status(401).json(info.message);
                if (strategy === 'local-register') return res.status(409).json(info.message);
            }
            req.logIn(user, {session: false}, function (err) {
                if (err) return next(err);
            });
            var token = jwt.sign(user, SECRET, {expiresInMinutes: 1440});
            return res.status(200).json({token: token});
        })(req, res, next);
    }
};