/**
 * Created by Eric on 08/04/2015.
 */

var r = require('rethinkdb');
var Q = require('q');
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
var nodemailer = require('nodemailer');
var authorization = require('./authorization_module');
if (nconf.get('db') === 'mongodb') user_middleware = require('./users_middlewares');
else if (nconf.get('db') === 'mysql') user_middleware = require('./users_middlewares_mysql');
else if (nconf.get('db') === 'rethink') user_middleware = require('./rethink/users_rethink');

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
            exp: moment().add(365, 'day').unix(),
            iat: moment().unix(),
            sub: user._id
        };
        return jwt.encode(payload, nconf.get('secret'));
    }

    function createResetToken(user) {
        var payload = {
            exp: moment().add(7, 'days').unix(),
            iat: moment().unix(),
            reset: true,
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

    function loginRethink(req, credentials, done) {
        r.table('users')
            .filter(function (doc) {
                return doc('username').eq(credentials.username);
            })
            .run(req.rdb)
            .then(function (res) {
                return Q(res.toArray());
            })
            .then(function (res) {
                if (!res[0])
                    return done(null, false, {message: 'User does not exist.'});
                comparePassword(res[0], credentials.password, function (err, isMatch) {
                    if (err)
                        return done(err);
                    if (!isMatch)
                        return done(null, false, {message: 'Invalid password'});
                    return done(null, res[0]);
                });
            })
            .catch(done);
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
        else if (nconf.get('db') === 'rethink')
            loginRethink(req, credentials, done);
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

    server.post('/api/forgot',
        function (req, res, next) {
            if (!req.body.username) return res.status(400).json('missing params');
            user_middleware.getByMail(req)
                .then(function (user) {
                    if (!user) return res.status(500).json('user does not exist');
                    req.user = user;
                    next();
                })
                .catch(function (err) { return res.status(500).json(err); });
        },
        function (req, res) {
            var resetToken = createResetToken(req.user);
            user_middleware.update({rdb: req.rdb, params: {id: req.user._id}, body: {resetPasswordToken: resetToken}});
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: nconf.get('gmail').email,
                    pass: nconf.get('gmail').password
                }
            });

            var link = nconf.get('host').local + '/reset/' + resetToken;

            var message = '<div>' + nconf.get('language').en.hello + ' ' + req.user.name + ',</div><br/>' +
                '<div>' + nconf.get('language').en.resetCore + '</div><br/>' +
                'Confirmation Link: <a href=' + link + '>' + link + '</a><br/><br/>' +
                nconf.get('language').en.resetEnd + '<br/><br/>' +
                nconf.get('language').en.thank + ',<br/>' +
                nconf.get('language').en.team;

            var mailOptions = {
                from: 'Orphee ' + nconf.get('gmail').email,
                to: req.user.username,
                subject: 'Password reset',
                html: message
            };

            transporter.sendMail(mailOptions, function (err, info) {
                if (err) res.status(500).json(err);
                else res.status(200).json(info);
            });
        }
    );

    function validateResetToken(req, res, next) {
        user_middleware.getByResetToken({rdb: req.rdb, body: {resetPasswordToken: req.params.token}})
            .then(function (user) {
                if (!user) return res.status(404).json('user not found');

                var decoded = jwt.decode(req.params.token, nconf.get('secret'));
                var now = moment().unix();

                if (now > decoded.exp || !decoded.reset) {
                    return res.status(401).json('token has expired');
                } else {
                    req.user = user;
                    return next();
                }
            })
            .catch(function (err) { return res.status(500).json(err); });
    }

    server.get('/reset/:token',
        validateResetToken,
        function (req, res) { res.render('reset'); }
    );

    server.post('/reset/:token',
        validateResetToken,
        function (req, res) {
            if (!req.body.password) return res.status('400').json('missing params');
            user_middleware.update({rdb: req.rdb, params: {id: req.user._id}, body: {resetPasswordToken: '0', password: req.body.password}})
                .then(function () {
                    res.redirect('/');
                })
                .catch(function (err) {
                    res.send('error');
                });
        }
    );

    server.post('/auth/facebook', function (req, res) {
        var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
        var graphApiUrl = 'https://graph.facebook.com/v2.3/me' + '?fields=email,name,id';
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
                user_middleware.getByFbId({params: {fbId: profile.id}, mysql: req.mysql, rdb: req.rdb})
                    .then(function (existingUser) {
                        if (existingUser) {
                            var token = createToken(existingUser);
                            return res.send({token: token, user: existingUser});
                        } else {
                            return user_middleware.create({body: {
                                fbId: profile.id,
                                picture: 'https://graph.facebook.com/v2.3/' + profile.id + '/picture?type=large',
                                name: profile.name,
                                username: profile.email
                            }, mysql: req.mysql, rdb: req.rdb}).then(function (user) {
                                var token = createToken(user);
                                return res.send({token : token, user: user});
                            });
                        }
                    })
                    .catch(function (err) {
                        if (err.status) return res.status(err.status).send(err.message);
                        return res.status(500).send(err.message);
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
                user_middleware.getByGoogleId({params: {googleId: profile.sub}, mysql: req.mysql, rdb: req.rdb})
                    .then(function (existingUser) {
                        if (existingUser) {
                            var token = createToken(existingUser);
                            return res.send({token: token, user: existingUser});
                        } else {
                            return user_middleware.create({body: {
                                googleId: profile.sub,
                                picture: profile.picture.replace('sz=50', 'sz=200'),
                                name: profile.name,
                                username: profile.email
                            }, mysql: req.mysql, rdb: req.rdb}).then(function (user) {
                                var token = createToken(user);
                                return res.send({token : token, user: user});
                            });
                        }
                    })
                    .catch(function (err) {
                        if (err.status) return res.status(err.status).send(err.message);
                        return res.status(500).send(err.message);
                    });
            });
        });
    });

};