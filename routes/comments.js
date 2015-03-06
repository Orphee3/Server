/**
 * Created by superphung on 3/6/15.
 */

var express = require('express');
var middleware = require('../middlewares/comments_middlewares');
var utilities = require('../middlewares/utilities_module');

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

router.put('/comment/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.update, req, res, next);
});

router.delete('/comment/:id', function(req, res, next) {
    utilities.useMiddleware(middleware.delete, req, res, next);
});