/**
 * Created by superphung on 9/15/15.
 */

var r = require('rethinkdb');
var Q = require('q');

var rM = require('./rethink_module');

exports.create = create;

function create(obj, req) {
    var data = {};
    data.type = obj.type;
    if (obj.media) data.media = obj.media;
    data.userSource = obj.userSource;
    data.dateCreation = new Date();
    return r.table('notifications')
        .insert(data, {returnChanges: true})
        .run(req.rdb)
        .then(function (res) {
            return Q.resolve(res.changes[0].new_val);
        })
        .catch(rM.reject);
}