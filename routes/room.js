/**
 * Created by superphung on 8/19/15.
 */
var express = require('express');
var utilities = require('../middlewares/utilities_module');
var nconf = require('nconf');
var authorization = require('../middlewares/authorization_module');
var middleware;

if (nconf.get('db') === 'mongodb') {
    middleware = require('../middlewares/room_middlewares');
} else if (nconf.get('db') === 'rethink') {
    middleware = require('../middlewares/rethink/room_rethink');
}

var router = express.Router();

router.get('/room/privateMessage/:id',
    authorization.validateToken({secret: nconf.get('secret')}),
    function (req, res, next) {
        utilities.useMiddleware(middleware.getPrivateMessage, req, res, next);
    });

router.get('/room/:id/groupMessage',
    authorization.validateToken({secret: nconf.get('secret')}),
    function (req, res, next) {
        utilities.useMiddleware(middleware.getGroupMessage, req, res, next);
    });

module.exports = router;