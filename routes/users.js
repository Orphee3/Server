var express = require('express');
var utilities = require('../middlewares/utilities_module');
var nconf = require('nconf');
var jwt = require('express-jwt');
var middleware;

if (nconf.get('db') === 'mongodb') {
    middleware = require('../middlewares/users_middlewares');
    console.log('use mongodb users middleware');
}
else if (nconf.get('db') === 'mysql') {
    middleware = require('../middlewares/users_middlewares_mysql');
    console.log('use mysql users middleware');
}

var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

router.post('/user',
    jwt({secret: nconf.get('secret')}),
    utilities.isAdmin,
    function (req, res, next) {
    utilities.useMiddleware(middleware.create, req, res, next);
});

router.get('/user', function (req, res, next) {
    utilities.useMiddleware(middleware.getAll, req, res, next);
});

router.get('/user/:id', function (req, res, next) {
    utilities.useMiddleware(middleware.getById, req, res, next);
});

router.get('/user/:id/creation', function (req, res, next) {
    utilities.useMiddleware(middleware.getCreation, req, res, next);
});

router.get('/user/:id/creationPrivate',
    jwt({secret: nconf.get('secret')}),
    function (req, res, next) {
    utilities.useMiddleware(middleware.getCreationPrivate, req, res, next);
});

router.get('/user/:id/group', function (req, res, next) {
    utilities.useMiddleware(middleware.getGroup, req, res, next);
});

router.get('/user/:id/likes', function (req, res, next) {
    utilities.useMiddleware(middleware.getLikes, req, res, next);
});

router.get('/user/:id/comments', function (req, res, next) {
    utilities.useMiddleware(middleware.getComments, req, res, next);
});

router.get('/user/:id/friends', function (req, res, next) {
    utilities.useMiddleware(middleware.getFriends, req, res, next);
});

router.put('/user/:id',
    jwt({secret: nconf.get('secret')}),
    utilities.isUserOrAdmin,
    function (req, res, next) {
    utilities.useMiddleware(middleware.update, req, res, next);
});

router.delete('/user/:id',
    jwt({secret: nconf.get('secret')}),
    utilities.isAdmin,
    function (req, res, next) {
    utilities.useMiddleware(middleware.delete, req, res, next);
});

module.exports = router;