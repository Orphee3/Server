/**
 * Created by superphung on 3/3/15.
 */

var express = require('express');
var middleware = require('../middlewares/creations_middlewares');
var utilities = require('../middlewares/utilities_module');

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

router.get('/creation/:id/creator', function(req, res, next) {
    utilities.useMiddleware(middleware.getCreator, req, res, next);
});

router.get('/creation/:id/group', function(req, res, next) {
    utilities.useMiddleware(middleware.getCreatorGroup, req, res, next);
});

router.get('/creation/:id/comments', function(req, res, next) {
    utilities.useMiddleware(middleware.getComments, req, res, next);
});

router.put('/creation/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.update, req, res, next);
});

router.delete('/creation/:id', function(req, res, next) {
   utilities.useMiddleware(middleware.delete, req, res, next);
});

module.exports = router;