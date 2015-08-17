/**
 * Created by superphung on 8/17/15.
 */

var jwt = require('jwt-simple');
var nconf = require('nconf');
var User = require('../middlewares/users_middlewares');

exports.validateToken = validateToken;

function validateToken(socket, next) {
    var req = socket.request;
    if (req._query && req._query.token) {
        var token = req._query.token;
        try {
            var decoded = jwt.decode(token, nconf.get('secret'));
        } catch (err) {
            return next(new Error('not authorized'));
        }
        User.getById({params: {id: decoded.sub}})
            .then(function (user) {
                if (!user) return next(new Error('user does not exist'));
                req.user = user;
                next();
            })
            .catch(next);
    } else {
        return next(new Error('not authorized'))
    }
}