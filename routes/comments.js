/**
 * Created by superphung on 3/6/15.
 */

var express = require('express');
var utilities = require('../middlewares/utilities_module');
var nconf = require('nconf');
var jwt = require('express-jwt');
var middleware;

if (nconf.get('db') === 'mongodb') {
    middleware = require('../middlewares/comments_middlewares');
    console.log('use mongodb comments middleware');
}
else if (nconf.get('db') === 'mysql') {
    middleware = require('../middlewares/comments_middlewares_mysql');
    console.log('use mysql comments middleware');
}

var router = express.Router();

router.post('/comment', function(req, res, next) {
   utilities.useMiddleware(middleware.create, req, res, next);
});

router.get('/comment', function(req, res, next) {
   utilities.useMiddleware(middleware.getAll, req, res, next);
});

router.get('/comment/:id', function(req, res, next) {
   utilities.useMiddleware(middleware.getById, req, res, next);
});

router.get('/comment/:id/creator', function(req, res, next) {
   utilities.useMiddleware(middleware.getCreator, req, res, next);
});

router.put('/comment/:id',
    jwt({secret: nconf.get('secret')}),
    utilities.isCreatorOrAdmin(middleware.getById, 'comments'),
    function(req, res, next) {
    utilities.useMiddleware(middleware.update, req, res, next);
});

router.delete('/comment/:id',
    jwt({secret: nconf.get('secret')}),
    utilities.isCreatorOrAdmin(middleware.getById, 'comments'),
    function(req, res, next) {
    utilities.useMiddleware(middleware.delete, req, res, next);
});

module.exports = router;