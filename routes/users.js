var express = require('express');
var middleware = require('../middlewares/users_middlewares');
var utilities = require('../middlewares/utilities_module');

var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/user', function(req, res, next) {
    utilities.useMiddleware(middleware.create, req, res, next);
});

router.get('/user', function(req, res, next) {
    utilities.useMiddleware(middleware.getAll, req, res, next);
});

router.get('/user/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.getById, req, res, next);
});

router.get('/user/:id/creation', function(req, res, next) {
    utilities.useMiddleware(middleware.getCreation, req, res, next);
});

router.get('/user/:id/group', function(req, res, next) {
    utilities.useMiddleware(middleware.getGroup, req, res, next);
});

router.get('/user/:id/likes', function(req, res, next) {
    utilities.useMiddleware(middleware.getLikes, req, res, next);
});

router.get('/user/:id/comments', function(req, res, next) {
    utilities.useMiddleware(middleware.getComments, req, res, next);
});

router.get('/user/:id/friends', function(req, res, next) {
    utilities.useMiddleware(middleware.getFriends, req, res, next);
});

router.put('/user/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.update, req, res, next);
});

router.delete('/user/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.delete, req, res, next);
});

module.exports = router;
