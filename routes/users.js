var express = require('express');
var middleware = require('../middlewares/users_middlewares');

var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/user', function(req, res, next) {
  middleware.create(req, res)
      .then(function(data) {res.send(data);})
      .catch(function(err) {res.status(err.status).send(err.message);})
      .done();
});

router.get('/user', function(req, res, next) {
    middleware.getAll(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});
router.get('/user/:id', function(req, res, next) {
    middleware.getById(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});

router.get('/user/:id/creation', function(req, res, next) {
    middleware.getById(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});

router.get('/user/:id/group', function(req, res, next) {
    middleware.getGroup(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});

router.get('/user/:id/likes', function(req, res, next) {
    middleware.getLikes(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});

router.get('/user/:id/comments', function(req, res, next) {
    middleware.getComments(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});

router.get('/user/:id/friends', function(req, res, next) {
    middleware.getFriends(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});

router.put('/user/:id', function(req, res, next) {
    middleware.update(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});

router.delete('/user/:id', function(req, res, next) {
    middleware.delete(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.status(err.status).send(err.message);})
        .done();
});

module.exports = router;
