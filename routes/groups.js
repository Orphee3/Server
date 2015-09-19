/**
 * Created by Eric on 17/03/2015.
 */

var express = require('express');
var utilities = require('../middlewares/utilities_module');
var nconf = require('nconf');
var authorization = require('../middlewares/authorization_module');
var middleware;

if (nconf.get('db') === 'mongodb') {
    middleware = require('../middlewares/groups_middlewares');
    console.log('use mongodb groups middleware');
}
else if (nconf.get('db') === 'mysql') {
    middleware = require('../middlewares/groups_middlewares_mysql');
    console.log('use mysql groups middleware');
}

else if (nconf.get('db') === 'rethink') {
    middleware = require('../middlewares/rethink/groups_rethink');
    console.log('use rethink groups middleware');
}

var router = express.Router();

router.post('/group', function(req, res, next) {
    utilities.useMiddleware(middleware.create, req, res, next);
});

router.get('/group', function(req, res, next) {
    utilities.useMiddleware(middleware.getAll, req, res, next);
});

router.get('/group/:id', function(req, res, next) {
   utilities.useMiddleware(middleware.getById, req, res, next);
});

router.get('/group/:id/members', function(req, res, next) {
   utilities.useMiddleware(middleware.getMembers, req, res, next);
});

router.get('/group/:id/creation', function(req, res, next) {
   utilities.useMiddleware(middleware.getCreation, req, res, next);
});

router.put('/group/:id',
    authorization.validateToken({secret: nconf.get('secret')}),
    utilities.isCreatorOrAdmin(middleware.getMembers, 'groups'),
    function(req, res, next) {
    utilities.useMiddleware(middleware.update, req, res, next);
});

router.delete('/group/:id',
    authorization.validateToken({secret: nconf.get('secret')}),
    utilities.isCreatorOrAdmin(middleware.getMembers, 'groups'),
    function(req, res, next) {
    utilities.useMiddleware(middleware.delete, req, res, next);
});

module.exports = router;