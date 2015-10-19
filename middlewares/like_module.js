/**
 * Created by superphung on 10/18/15.
 */

var nconf = require('nconf');
var authorization = require('./authorization_module');
var Q = require('q');
var Creations;
var Users;

if (nconf.get('db') === 'mongodb') {
    Creations = require('./creations_middlewares');
    Users = require('./users_middlewares');
}
else if (nconf.get('db') === 'rethink') {
    Creations = require('./rethink/creations_rethink');
    Users = require('./rethink/users_rethink');
}

module.exports = function (server) {
    server.get('/api/like/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        function (req, res, next) {
            if (req.user.likes.indexOf(req.params.id) >= 0) return res.status(400).json('already like');
            else next()
        },
        checkCreationExist,
        function (req, res, next) {
            req.user.likes.push(req.creation._id);
            req.nbLikes = req.creation.nbLikes + 1;
            next();
        },
        updateUserAndCreation
    );

    server.get('/api/dislike/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        function (req, res, next) {
            if (req.user.likes.indexOf(req.params.id) === -1) return res.status(400).json('not like yet');
            else next();
        },
        checkCreationExist,
        function (req, res, next) {
            var index = req.user.likes.indexOf(req.params.id);
            req.user.likes.splice(index, 1);
            req.nbLikes = req.creation.nbLikes - 1;
            next();
        },
        updateUserAndCreation
    );

    function checkCreationExist(req, res, next) {
        Creations.getById(req)
            .then(function (data) {
                if (!data) return res.status(400).json('creation does not exist');
                else {
                    req.creation = data;
                    next();
                }
            })
            .catch(function (err) {
                return res.status(500).json(err);
            });
    }

    function updateUserAndCreation(req, res) {
        Q.all([updateUserLike(), incrementCreationLike()])
            .spread(function (user) {
                return res.status(200).json(user);
            })
            .catch(function (err) {
                return res.status(500).json(err);
            });

        function updateUserLike() {
            return Users.update({
                rdb: req.rdb,
                params: {
                    id: req.user._id
                },
                body: {
                    likes: req.user.likes
                }
            });
        }

        function incrementCreationLike() {
            return Creations.update({
                rdb: req.rdb,
                params: {
                    id: req.creation._id
                },
                body: {
                    nbLikes: req.nbLikes
                }
            });
        }
    }
};