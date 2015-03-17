/**
 * Created by Eric on 14/03/2015.
 */

var httpMocks = require('node-mocks-http'),
    chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    mongoose = require('mongoose'),
    mockgoose = require('mockgoose');

chai.use(chaiAsPromised);

mockgoose(mongoose);

var Model = require('../models/data_models.js');

var middleware = require('../middlewares/groups_middlewares');

var req, res;

beforeEach(function() {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
});

describe('Unit test for groups middleware', function() {
    describe('create middleware unit test', function() {
        it('resolves creating group', function() {
            return Model.User.create({name: 'createGroup', username: 'createGroup', password: 'createGroup'})
                .then(function(user) {
                    req = httpMocks.createRequest({
                        body: {
                            name: 'createGroup',
                            members: user._id
                        }
                    });
                    return chai.expect(middleware.create(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('rejects creating group without name', function() {
            return chai.expect(middleware.create(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('getAll middleware unit test', function() {
        it('resolves pull all groups from mock db', function() {
            return chai.expect(middleware.getAll(req, res))
                .to.be.fulfilled.then(console.log);
        });
    });

    describe('getById middleware unit test', function() {
        it('resolves pull one group by the id', function() {
            return Model.User.create({name: 'getByIdGroup', username: 'getByIdGroup', password: 'getByIdGroup'})
                .then(function(user) {
                    return Model.Group.create({name: 'getByIdGroup', members: [user._id]});
                })
                .then(function(model) {
                    req = httpMocks.createRequest({
                        params: {
                            id: model._id
                        }
                    });
                    return chai.expect(middleware.getById(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('rejects pull wrong group', function() {
            //@TODO 123456 -> err cast, wrong id -> err 204
            //var idd = new mongoose.Types.ObjectId;
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.getById(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('getMembers middleware unit test', function() {
        it('resolves get an array of members from a group', function() {
            return Model.User.create({name: 'getMembersGroup', username: 'getMembersGroup', password: 'getMembersGroup'})
                .then(function(user) {
                    return Model.Group.create({name: 'getMembersGroup', members: [user._id]});
                })
                .then(function(group) {
                    req = httpMocks.createRequest({
                        params: {
                            id: group._id
                        }
                    });
                    return chai.expect(middleware.getMembers(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('rejects getting from a wrong id of group', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.getMembers(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('getCreation middleware unit test', function() {
        it('resolves get an array of creation from a group', function() {
            return Model.User.create({name: 'getCreationGroup', username: 'getCreationGroup', password: 'getCreationGroup'})
                .then(function(user) {
                    return Model.Creation.create({name: 'getCreationGroup', creator: [user._id]})
                        .then(function(creation) {
                            return Model.Group.create({name: 'getCreationGroup', members: [user._id], creation: [creation._id]});
                        })
                        .then(function(group) {
                            req = httpMocks.createRequest({
                                params: {
                                    id: group._id
                                }
                            });
                            return chai.expect(middleware.getCreation(req, res))
                                .to.be.fulfilled.then(console.log);
                        });
                });
        });

        it ('rejects getting from a wrong id of group', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.getCreation(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('update middleware unit test', function() {
        it('resolves updating group', function() {
            return Model.User.create({name: 'updateGroup', username: 'updateGroup', password: 'updateGroup'})
                .then(function(user) {
                    return Model.Group.create({name: 'updateGroup', members: [user._id]})
                        .then(function (group) {
                            req = httpMocks.createRequest({
                                params: {
                                    id: group._id
                                },
                                body: {
                                    members: [user._id, new mongoose.Types.ObjectId]
                                }
                            });
                            return chai.expect(middleware.update(req, res))
                                .to.be.fulfilled.then(console.log);
                        });
                });
        });

        it('rejects updating wrong group', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.update(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('delete middleware unit test', function() {
        it('resolves deleting group', function() {
            return Model.User.create({name: 'deleteGroup', username: 'deleteGroup', password: 'deleteGroup'})
                .then(function(user) {
                    return Model.Group.create({name: 'deleteGroup', members: [user._id]});
                })
                .then(function(group) {
                    req = httpMocks.createRequest({
                        params: {
                            id: group._id
                        }
                    });
                    return chai.expect(middleware.delete(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('rejects deleting group', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.delete(req, res))
                .to.be.rejected.then(console.log);
        });
    });
});