/**
 * Created by superphung on 3/1/15.
 */

var httpMocks = require('node-mocks-http'),
    chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    mongoose = require('mongoose'),
    mockgoose = require('mockgoose');

chai.use(chaiAsPromised);
mockgoose(mongoose);

var Model = require('../models/data_models.js');

var middleware = require('../middlewares/creations_middlewares');

var req, res;

beforeEach(function() {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
});

describe('Unit test for creations middleware', function() {
    describe('create middleware unit test', function() {
       it('resolves creating creation', function() {
            req = httpMocks.createRequest({
                body: {
                    name: 'test1'
                }
            });
           return chai.expect(middleware.create(req, res))
               .to.be.fulfilled.then(function(data) {
                   console.log(data + '\n');
               });
       });

        it('rejects creating creation without name', function() {
            return chai.expect(middleware.create(req, res))
                .to.be.rejected.then(function(data) {
                    console.log(data + '\n');
                });
        })
    });

    describe('getAll middleware unit test', function() {
        it('resolves pull all creations from mock db', function() {
            return chai.expect(middleware.getAll(req, res))
                .to.be.fulfilled.then(function(data) {
                    console.log(data + '\n');
                })
        });
    });

    describe('getById middleware unit test', function() {
        it('it resolves pull one creation', function() {
            return Model.Creation.create({name: 'test2'})
                .then(function(creation) {
                    req = httpMocks.createRequest({
                        params: {
                            id: creation._id
                        }
                    });
                    return chai.expect(middleware.getById(req, res))
                        .to.be.fulfilled.then(function(data) {
                            console.log(data + '\n');
                        });
                })
        });

        it('resolves pull creation with a bad id', function() {
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

        it('rejects pull creation without an ObjectId', function() {
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
        it('resolves get an array of creators from a creation', function() {
            return Model.User.create({
                name: 'getCreator',
                username: 'getCreator',
                password: 'getCreator'
            }).then(function(user) {
                var obj = new Model.Creation();
                obj.name = 'getCreator';
                obj.creator.push(user._id);
                return Model.Creation.create(obj);
            }).then(function(creation) {
                req = httpMocks.createRequest({
                    params: {
                        id: creation._id
                    }
                });
                return chai.expect(middleware.getCreator(req, res))
                    .to.be.fulfilled.then(console.log);
            });
        });

        it('resolves getting from a creation with a bad id', function() {
            req = httpMocks.createRequest({
                params: {
                    id: new mongoose.Types.ObjectId
                }
            });
            return chai.expect(middleware.getCreator(req, res))
                .to.be.fulfilled.then(function(data) {
                    console.log(data === null);
                });
        });

        it('rejects getting from a creation without an ObjectId', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.getCreator(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('getCreatorGroup middleware unit test', function() {
        it('resolves get an object of group from a creation', function() {
            return Model.Group.create({name: 'getCreatorGroup'})
                .then(function(group) {
                    var obj = new Model.Creation();
                    obj.name = 'getCreatorGroup';
                    obj.creatorGroup = group._id;
                    return Model.Creation.create(obj);
                })
                .then(function(creation) {
                    req = httpMocks.createRequest({
                        params: {
                            id: creation._id
                        }
                    });
                    return chai.expect(middleware.getCreatorGroup(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('resolves getting from a creation with a bad id', function() {
            req = httpMocks.createRequest({
                params: {
                    id: new mongoose.Types.ObjectId
                }
            });
            return chai.expect(middleware.getCreatorGroup(req, res))
                .to.be.fulfilled.then(function(data) {
                    console.log(data === null);
                });
        });

        it('rejects getting from a creation without an ObjectId', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.getCreatorGroup(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('getComments middleware unit test', function() {
       it('resolves get an array of comments from a creation', function() {
           return Model.User.create({name: 'getCommentsCreation', username: 'getCommentsCreation', password: 'getCommentsCreation'})
               .then(function(user) {
                   return Model.Comment.create({creator: user._id, message: 'getComments'});
               })
               .then(function(comment) {
                   var obj = new Model.Creation();
                   obj.name = 'getComments';
                   obj.comments.push(comment._id);
                   return Model.Creation.create(obj);
               })
               .then(function(creation) {
                   req = httpMocks.createRequest({
                       params: {
                           id: creation._id
                       }
                   });
                   return chai.expect(middleware.getComments(req, res))
                       .to.be.fulfilled.then(console.log);
               });
       });

        it('resolves getting from a comment with a bad id', function() {
            req = httpMocks.createRequest({
                params: {
                    id: new mongoose.Types.ObjectId
                }
            });
            return chai.expect(middleware.getComments(req, res))
                .to.be.fulfilled.then(function(data) {
                    console.log(data === null);
                });
        });

        it('rejects getting from a creation without an ObjectId', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middleware.getComments(req, res))
                .to.be.rejected.then(console.log);
        });
    });

    describe('update middleware unit test', function() {
        it('resolves updating creation', function() {
            return Model.Creation.create({name: 'test3'})
                .then(function(creation) {
                    req = httpMocks.createRequest({
                        params: {
                            id: creation._id
                        }
                    });

                    return chai.expect(middleware.update(req, res))
                        .to.be.fulfilled.then(console.log);
                });
        });

        it('resolves updating creation with a bad id', function() {
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

        it('rejects updating creation without an ObjectId', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });

            return chai.expect(middleware.getById(req, res))
                .to.be.rejected.then(console.log);
        })
    });

    describe('delete middleware unit test', function() {
        it('resolves deleting creation', function() {
            return Model.Creation.create([{
                name: 'test4'
            }, {
                name: 'test5'
            }])
                .then(function(test1, test2) {
                    req = httpMocks.createRequest({
                        params: {
                            id: test1._id
                        }
                    });

                    return chai.expect(middleware.delete(req, res))
                        .to.be.fulfilled.then(console.log);
                })
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
        })
    });

});