/**
 * Created by superphung on 9/12/15.
 */

var Q = require('q');
var r = require('rethinkdb');
var bcrypt = require('bcrypt-nodejs');

var errMod = require('./../error_module');

exports.createConnection = createConnection;
exports.closeConnection = closeConnection;
exports.hashPassword = hashPassword;

exports.resolveArray = resolveArray;
exports.resolve = resolve;
exports.resolveArgs = resolveArgs;
exports.reject = reject;

function createConnection(req, res, next) {
    r.connect({
        db: 'orphee'
    }).then(function (conn) {
        req.rdb = conn;
        next();
    }).catch(function (err) {
        res.send(500, {error: err.message});
    });
}

function closeConnection(req, res, next) {
    req.rdb.close();
    next();
}

function hashPassword(pwd) {
    var salt = bcrypt.genSaltSync();
    return bcrypt.hashSync(pwd, salt);
}

function resolveArray(res) {
    return Q(res.toArray());
}

function resolve(res) {
    return Q(res);
}

function resolveArgs() {
    return Q([].slice.call(arguments));
}

function reject(err) {
    return Q.reject(errMod.getError(err, 500));
}