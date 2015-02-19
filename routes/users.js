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

router.get('/user/:id', function(req, res, next) {
    middleware.getById(req, res)
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

router.delete('/user/:id', function(req, res, next) {
    middleware.delete(req, res)
        .then(function(data) {res.send(data);})
        .catch(function(err) {res.send(err);})
        .done();
});

module.exports = router;
