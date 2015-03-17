/**
 * Created by Eric on 17/03/2015.
 */

var express = require('express');
var middleware = require('../middlewares/groups_middlewares');
var utilities = require('../middlewares/utilities_module');

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

router.get('/group/:id', function(req, res, next) {
   utilities.useMiddleware(middleware.getMembers, req, res, next);
});

router.get('/group/:id', function(req, res, next) {
   utilities.useMiddleware(middleware.getCreation, req, res, next);
});

router.put('/group/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.update, req, res, next);
});

router.delete('/group/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.delete, req, res, next);
});

module.exports = router;


















































































































