/**
 * Created by superphung on 3/5/15.
 */

var httpMocks = require('node-mocks-http'),
    chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    mongoose = require('mongoose'),
    mockgoose = require('mockgoose');

chai.use(chaiAsPromised);
mockgoose(mongoose);

var Model = require('../models/data_models.js');

var middleware = require('../middlewares/comments_middlewares');

var req, res;

beforeEach(function() {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
});

describe('Unit test for comments middleware', function() {
    describe('create middleware unit test', function() {
        it('resolves creating comment', function() {
            return Model.User.create({name: 'createComment', username: 'createComment', password: 'createComment'})
                .then(function(user) {
                    req = httpMocks.createRequest({
                        body: {
                            creator: user._id,
                            message: 'createComment'
                        }
                    });
                    return chai.expect(middleware.create(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('rejects creating comment without creator', function() {
            return chai.expect(middleware.create(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('getAll middleware unit test', function() {
        it('resolves pull all comments from mock db', function() {
            return chai.expect(middleware.getAll(req, res))
                .to.be.fulfilled.then(console.log);
        });
    });

    describe('getById middleware unit test', function() {
        it('resolves pull one comment', function() {
            return Model.User.create({name: 'getByIdComment', username: 'getByIdComment', password: 'getByIdComment'})
                .then(function(user) {
                    return Model.Comment.create({creator: user._id, message: 'getByIdComment'});
                })
                .then(function(comment) {
                    req = httpMocks.createRequest({
                        params: {
                            id: comment._id
                        }
                    });
                    return chai.expect(middleware.getById(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('resolves pull comment with a bad id', function() {
            req = httpMocks.createRequest({
                params: {
                    id: new mongoose.Types.ObjectId
                }
            });
            return chai.expect(middleware.getById(req, res))
                .to.be.fulfilled.then(function(data) {
                    console.log(data === null);
                });
        });

        it('rejects pull comment without an ObjectId', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.getById(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('getCreator middleware unit test', function() {
        it('resolves get an object of user from a comment', function() {
            return Model.User.create({name: 'getCreatorComment', username: 'getCreatorComment', password: 'getCreatorComment'})
                .then(function(user) {
                    return Model.Comment.create({creator: user._id, message: 'getCreatorComment'});
                })
                .then(function(comment) {
                    req = httpMocks.createRequest({
                        params: {
                            id: comment._id
                        }
                    });
                    return chai.expect(middleware.getCreator(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('resolves getting from a comment with a bad id', function() {
            req = httpMocks.createRequest({
                params: {
                    id: new mongoose.Types.ObjectId
                }
            });
            return chai.expect(middleware.getCreator(req, res))
                .to.be.fulfilled.then(function(data) {
                    console.log(data === null);
                })
        });

        it('rejects getting from a comment without an ObjectId', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.getCreator(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('update middleware unit test', function() {
        it('resolves updating comment', function() {
            return Model.User.create({name: 'updateComment', username: 'updateComment', password: 'updateComment'})
                .then(function(user) {
                    return Model.Comment.create({creator: user._id, message: 'updateComment1'});
                })
                .then(function(comment) {
                    req = httpMocks.createRequest({
                        params: {
                            id: comment._id
                        },
                        body: {
                            message: 'updateComment2'
                        }
                    });
                    return chai.expect(middleware.update(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('resolves updating comment with a bad id', function() {
            req = httpMocks.createRequest({
                params: {
                    id: new mongoose.Types.ObjectId
                }
            });
            return chai.expect(middleware.update(req, res))
                .to.be.fulfilled.then(function(data) {
                    console.log(data === null);
                });
        });

        it('rejects updating comment without an ObjectId', function() {
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
        it('resolves deleting comment', function() {
            return Model.User.create({name: 'deleteComment', username: 'deleteComment', password: 'deleteComment'})
                .then(function(user) {
                    return Model.Comment.create({creator: user._id, message: 'deleteComment'});
                })
                .then(function(comment) {
                    req = httpMocks.createRequest({
                        params: {
                            id: comment._id
                        }
                    });
                    return chai.expect(middleware.delete(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('resolves deleting creation with a bad id', function() {
            req = httpMocks.createRequest({
                params: {
                    id: new mongoose.Types.ObjectId
                }
            });
            return chai.expect(middleware.delete(req, res))
                .to.be.fulfilled.then(console.log);
        });

        it('rejects deleting creation without an ObjectId', function() {
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