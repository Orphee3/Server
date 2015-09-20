/**
 * Created by superphung on 9/15/15.
 */

var Q = require('q');
var r = require('rethinkdb');

var rM = require('./rethink_module');
var Creations = require('./creations_rethink');

exports.create = create;
exports.getCreator = getCreator;
exports.getCreationComments = getCreationComments;
exports.getById = getById;

function create(req) {
    return Creations.getById({rdb: req.rdb, params: {id: req.body.creation}})
        .then(function (creation) {
            var data = {};
            data.creation = req.body.creation;
            data.creator = req.body.creator;
            data.message = req.body.message;
            data.dateCreation = new Date();
            data.child = [];
            if (req.body.creation === req.body.parentId) {
                data.parentId = null;
                return r.table('comments')
                    .insert(data, {returnChanges: true})
                    .run(req.rdb)
                    .then(function (res) {
                        return r.table('creations')
                            .get(creation._id)
                            .update({nbComments: creation.nbComments + 1}, {returnChanges: true})
                            .run(req.rdb)
                            .then(function () {
                                return Q(res.changes[0].new_val);
                            });
                    });
            } else {//@todo sub comment
                /*data.parentId = req.body.parentId;
                return getById({rdb: req.rdb, params: {id: req.body.parentId}})
                    .then(function (res) {
                        data.parentId = req.body.parentId;
                        res.child.push(data);
                    });*/
            }
        })
        .catch(rM.reject)
}

function getCreator(req) {
    return r.table('comments')
        .get(req.params.id)
        .run(req.rdb)
        .then(function (comment) {
            return Q(r.table('users').get(comment.creator).run(req.rdb).then(rM.resolve));
        })
        .catch(rM.reject);
}

function getCreationComments(req) {
    var offset = (typeof req.query.offset === 'undefined') ? 0 : parseInt(req.query.offset),
        size = (typeof req.query.size === 'undefined') ? 8888 : parseInt(req.query.size);

    return r.table('comments')
        .filter(r.row('creation').eq(req.params.id))
        .map(function (comment) {
            return comment.merge({
                creator: r.table('users').get(comment('creator')).pluck('_id', 'name', 'picture')
            })
        })
        .skip(offset)
        .limit(size)
        .run(req.rdb)
        .then(rM.resolveArray)
        .catch(rM.reject);
}

function getById(req) {
    return r.table('comments')
        .get(req.params.id)
        .run(req.rdb)
        .then(rM.resolve)
        .catch(rM.reject);
}

function update() {

}