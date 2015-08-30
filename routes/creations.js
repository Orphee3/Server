/**
 * Created by superphung on 3/3/15.
 */

var express = require('express');
var utilities = require('../middlewares/utilities_module');
var nconf = require('nconf');
var authorization = require('../middlewares/authorization_module');
var middleware;

if (nconf.get('db') === 'mongodb') {
    middleware = require('../middlewares/creations_middlewares');
    console.log('use mongodb creations middleware');
}
else if (nconf.get('db') === 'mysql') {
    middleware = require('../middlewares/creations_middlewares_mysql');
    console.log('use mysql creations middleware');
}

var router = express.Router();

router.post('/creation', function(req, res, next) {
    utilities.useMiddleware(middleware.create, req, res, next);
});

router.get('/creation', function(req, res, next) {
    utilities.useMiddleware(middleware.getAll, req, res, next);
});

router.get('/creation/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.getById, req, res, next);
});

router.get('/creation/:id/private',
    authorization.validateToken({secret: nconf.get('secret')}),
    function(req, res, next) {
    utilities.useMiddleware(middleware.getByIdPrivate, req, res, next);
});

router.get('/creationPopular', function (req, res, next) {
    utilities.useMiddleware(middleware.getPopular, req, res, next);
});

router.get('/creation/:id/creator', function(req, res, next) {
    utilities.useMiddleware(middleware.getCreator, req, res, next);
});

router.get('/creation/:id/group', function(req, res, next) {
    utilities.useMiddleware(middleware.getCreatorGroup, req, res, next);
});

router.get('/creation/:id/comments', function(req, res, next) {
    utilities.useMiddleware(middleware.getComments, req, res, next);
});

router.put('/creation/:id',
    authorization.validateToken({secret: nconf.get('secret')}),
    utilities.isCreatorOrAdmin(middleware.getCreator, 'creations'),
    function(req, res, next) {
    utilities.useMiddleware(middleware.update, req, res, next);
});

router.delete('/creation/:id',
    authorization.validateToken({secret: nconf.get('secret')}),
    utilities.isCreatorOrAdmin(middleware.getCreator, 'creations'),
    function(req, res, next) {
    utilities.useMiddleware(middleware.delete, req, res, next);
});

module.exports = router;