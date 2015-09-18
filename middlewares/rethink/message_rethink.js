/**
 * Created by superphung on 9/16/15.
 */

var Q = require('q');
var r = require('rethinkdb');

var rM = require('./rethink_module');

exports.create = create;

function create(req) {
    var data = {
        creator: req.body.creator,
        message: req.body.message,
        dateCreation: new Date()
    };
    return r.table('messages')
        .insert(data, {returnChanges: true})
        .run(req.rdb)
        .then(function (result) {
            return Q(result.changes[0].new_val);
        })
        .catch(rM.reject);
}