/**
 * Created by Eric on 08/04/2015.
 */

var Model = require('../models/data_models');
var bcrypt = require('bcrypt-nodejs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var jwt = require('jwt-simple');
var user_middleware;
var nconf = require('nconf');
var moment = require('moment');
var errMod = require('./error_module');
var request = require('request');
var authorization = require('./authorization_module');
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

    function createToken(user) {
        var payload = {
            exp: moment().add(1, 'day').unix(),
            iat: moment().unix(),
            sub: user._id
        };
        return jwt.encode(payload, nconf.get('secret'));
    }

    //middleware check token expired.
    server.use(authorization.checkTokenExpiration({secret: nconf.get('secret')}));
    //check error invalid token
    server.use(function (err, req, res, next) {
        if (err.message == 'Signature verification failed' || err.message == 'Not enough or too many segments')
            res.status(401).json('invalid token');
        else
            next();
    });

    function loginMysql(req, credentials, done) {
        req.mysql.getConnection(function (err, connection) {
            if (err) done(err);
            var customQuery = 'SELECT * FROM users WHERE username=?';
            connection.query(customQuery, credentials.username, function (err, rows) {
                if (err) done(err);
                if (rows.length === 0)
                    return done(null, false, {message: 'User does not exist.'});
                else {
                    comparePassword(rows[0], credentials.password, function (err, isMatch) {
                        if (err)
                            return done(err);
                        if (!isMatch)
                            return done(null, false, {message: 'Invalid password.'});
                        return done(null, rows[0]);
                    });
                }
                connection.release();
            });
        });
    }

    function loginMongodb(credentials, done) {
        Model.User.findOne()
            .where('username').equals(credentials.username)
            .select('+password')
            .exec(function (err, user) {
                if (err) return done(err);
                if (!user)
                    return done(null, false, {message: 'User does not exist.'});
                comparePassword(user, credentials.password, function (err, isMatch) {
                    if (err)
                        return done(err);
                    if (!isMatch)
                        return done(null, false, {message: 'Invalid password.'});
                    return done(null, user);
                });
            });
    }

    passport.use('bearer-login', new BearerStrategy({
        passReqToCallback: true
    }, function (req, token, done) {
        var tokenDecoded = new Buffer(token, 'base64').toString();
        var tokenSplit = tokenDecoded.split(':');
        if (tokenSplit.length != 2)
            return done(null, false);
        var credentials = {
            username: tokenSplit[0],
            password: tokenSplit[1]
        };
        if (nconf.get('db') === 'mongodb')
            loginMongodb(credentials, done);
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
        function (req, res) {
            var token = createToken(req.user);
            return res.status(200).json({token: token, user: req.user});
        });

    server.post('/api/register', function (req, res, next) {
        passport.authenticate('local-register', function (err, user, info) {
            if (err) return next(err);
            if (!user) return res.status(409).json(info.message);
            req.logIn(user, {session: false}, function (err) {
                if (err) return next(err);
            });
            var token = createToken(req.user);
            return res.status(200).json({token: token, user: req.user});
        })(req, res, next);
    });

    server.post('/auth/facebook', function (req, res) {
        var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
        var graphApiUrl = 'https://graph.facebook.com/v2.3/me';
        var params = {
            code: req.body.code,
            client_id: req.body.clientId,
            client_secret: nconf.get('facebook').secret,
            redirect_uri: req.body.redirectUri
        };
        console.log(params);
        request.get({url: accessTokenUrl, qs: params, json: true}, function (err, response, accessToken) {
            if (response.statusCode !== 200) {
                return res.status(500).send({message: accessToken.error.message});
            }
            request.get({url: graphApiUrl, qs: accessToken, json: true}, function (err, response, profile) {
                if (response.statusCode !== 200) {
                    return res.status(500).send({message: profile.error.message});
                }
                Model.User.findOne({fbId: profile.id}, function (err, existingUser) {
                    if (existingUser) {
                        var token = createToken(existingUser);
                        return res.send({token: token, user: existingUser});
                    }
                    var user = new Model.User();
                    user.fbId = profile.id;
                    user.picture =  'https://graph.facebook.com/v2.3/' + profile.id + '/picture?type=large';
                    user.name = profile.name;
                    user.save(function () {
                        var token = createToken(user);
                        return res.send({token: token, user: user});
                    });
                });
            });
        });
    });

    server.post('/auth/google', function (req, res) {
        var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
        var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';

        var params = {
            code: req.body.code,
            client_id: req.body.clientId,
            client_secret: nconf.get('google').secret,
            redirect_uri: req.body.redirectUri,
            grant_type: 'authorization_code'
        };

        request.post(accessTokenUrl, {json: true, form: params}, function (err, response, token) {
            var accessToken = token.access_token;
            var headers = {Authorization: 'Bearer ' + accessToken};

            request.get({url: peopleApiUrl, headers: headers, json: true}, function (err, response, profile) {
                if (profile.error) {
                    return res.status(500).send({message: profile.error.message});
                }
                Model.User.findOne({googleId: profile.sub}, function (err, existingUser) {
                    if (existingUser) {
                        var token = createToken(existingUser);
                        return res.send({token: token, user: existingUser});
                    }
                    var user = Model.User();
                    user.googleId = profile.sub;
                    user.picture = user.picture.replace('sz=50', 'sz=200');
                    user.name = profile.name;
                    user.save(function () {
                        var token = createToken(user);
                        return res.send({token: token, user: user});
                    });
                });
            });
        });
    });

};