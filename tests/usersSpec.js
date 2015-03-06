/**
 * Created by Eric on 19/02/2015.
 */

var httpMocks = require('node-mocks-http'),
    chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    mongoose = require('mongoose'),
    mockgoose = require('mockgoose');

chai.use(chaiAsPromised);
//mongoose.connect('mongodb://localhost/orpheeTest');
mockgoose(mongoose);

var Model = require('../models/data_models.js');
var mockdata = require('./data-fixtures');

Model.User.create(mockdata.User, function(err) {
    console.log(err || 'mockdata user created\n');
});

var middlewares = require('../middlewares/users_middlewares');

var req, res;

/*var req = httpMocks.createRequest({
    method: 'POST',
    body: {
        name: 'test1',
        username: 'test1',
        password: 'test1'
    }
});*/

beforeEach(function() {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
});

describe('Unit test for users middlewares', function() {
    describe('create middleware unit test', function() {
        it('resolves creating user', function() {
            req = httpMocks.createRequest({
                body: {
                    name: 'test1',
                    username: 'test1',
                    password: 'test1'
                }
            });
           return chai.expect(middlewares.create(req, res))
               .to.be.fulfilled.then(function(data) {
                    console.log(data + '\n');
               });
        });
        it('rejects creating same user', function() {
            req = httpMocks.createRequest({
                body: {
                    name: 'test1',
                    username: 'test1',
                    password: 'test1'
                }
            });
            return chai.expect(middlewares.create(req, res))
                .to.be.rejectedWith('user already exist');
        });
        it('rejects creating user without username and password', function() {
            return chai.expect(middlewares.create(req, res))
                .to.be.rejected;
        })
    });

    describe('getAll middleware unit test', function() {
        it('resolves pull all users from mock db', function() {
            return chai.expect(middlewares.getAll(req, res))
                .to.be.fulfilled.then(function(data) {
                    console.log(data + '\n');
                });
        })
    });

    describe('getById middleware unit test', function() {
        it('resolves pull first user', function() {
            return middlewares.getAll(req, res)
                .then(function(data) {
                    return data;
                })
                .then(function(data) {
                    req = httpMocks.createRequest({
                        params: {
                            id: data[0]._id
                        }
                    });
                    return chai.expect(middlewares.getById(req, res))
                        .to.be.fulfilled.then(function(data) {
                           console.log(data + '\n');
                        });
                })
        });

        it('rejects pull wrong user', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middlewares.getById(req, res))
                .to.be.rejected;
        });
    });

    describe('getCreation unit test', function() {
        it('resolves get an array of creation from a user', function() {
            return Model.Creation.create({name: 'creation'})
                .then(function(creation) {
                    var obj = new Model.User();
                    obj.name = 'getCreation';
                    obj.username = 'getCreation';
                    obj.password = 'getCreation';
                    obj.creation.push(creation._id);
                    return Model.User.create(obj);
                })
                .then(function(user) {
                    req = httpMocks.createRequest({
                        params: {
                            id: user._id
                        }
                    });
                    return chai.expect(middlewares.getCreation(req, res))
                        .to.be.fulfilled.then(function(data) {
                            console.log(data);
                        });
                })
        });
        it('rejects getting from a wrong id of user', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middlewares.getCreation(req, res))
                .to.be.rejected;
        });
    });

    describe('getGroup unit test', function() {
       it('resolves get an array of creation from a user', function() {
           return Model.Group.create({name: 'group'})
               .then(function(group) {
                   var obj = new Model.User();
                   obj.name = 'getGroup';
                   obj.username = 'getGroup';
                   obj.password = 'getGroup';
                   obj.group.push(group._id);
                   return Model.User.create(obj);
               })
               .then(function(user) {
                   req = httpMocks.createRequest({
                       params: {
                           id: user._id
                       }
                   });
                   return chai.expect(middlewares.getGroup(req, res))
                       .to.be.fulfilled.then(function(data) {
                           console.log(data);
                       })
               })
       });

        it('rejects getting from a wrong id of user', function() {
            req = httpMocks.createRequest({
               params: {
                   id: 123456
               }
            });
            return chai.expect(middlewares.getGroup(req, res))
                .to.be.rejected;
        });
    });

    describe('getLikes unit test', function() {
        it('resolves get an array of likes creation from a user', function() {
            return Model.Creation.create({name: 'creation2'})
                .then(function(creation) {
                    var obj = new Model.User();
                    obj.name = 'getCreation2';
                    obj.username = 'getCreation2';
                    obj.password = 'getCreation2';
                    obj.likes.push(creation._id);
                    return Model.User.create(obj);
                })
                .then(function(user) {
                    req = httpMocks.createRequest({
                        params: {
                            id: user._id
                        }
                    });
                    return chai.expect(middlewares.getLikes(req, res))
                        .to.be.fulfilled.then(function(data) {
                            console.log(data);
                        });
                })
        });

        it('rejects getting from a wrong id of user', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middlewares.getLikes(req, res))
                .to.be.rejected;
        });
    });

    describe('getComments unit test', function() {
        it('resolves get an array of comments from a user', function() {
            return Model.User.create({name: 'getCommentsUser', username: 'getCommentsUser', password: 'getCommentsUser'})
                .then(function(user) {
                   return Model.Comment.create({creator: user._id, message: 'comment'})
                       .then(function(comment) {
                           user.comments.push(comment._id);
                           user.save();

                           req = httpMocks.createRequest({
                               params: {
                                   id: user._id
                               }
                           });
                           return chai.expect(middlewares.getComments(req, res))
                               .to.be.fulfilled.then(function(data) {
                                   console.log(data);
                               });
                       })
                });
        });

        it('rejects getting from a wrong id of user', function() {
           req = httpMocks.createRequest({
               params: {
                   id: 123456
               }
           });
            return chai.expect(middlewares.getLikes(req, res))
                .to.be.rejected;
        });
    });

    describe('getFriends unit test', function() {
        it('resolves get an array of friends from a user', function() {
            var array = [{
                name: 'friend1',
                username: 'friends1',
                password: 'friend1'
            },{
                name: 'friend2',
                username: 'friend2',
                password: 'friend2'
            }];
            return Model.User.create(array)
                .then(function(friend1, friend2) {
                    var obj = new Model.User();
                    obj.name = 'getFriends';
                    obj.username = 'getFriends';
                    obj.password = 'getFriends';
                    obj.friends.push(friend1._id);
                    obj.friends.push(friend2._id);
                    return Model.User.create(obj);
                })
                .then(function(user) {
                    req = httpMocks.createRequest({
                        params: {
                            id: user._id
                        }
                    });
                    return chai.expect(middlewares.getFriends(req, res))
                        .to.be.fulfilled.then(function(data) {
                            console.log(data);
                        })
                })
        });

        it('rejects getting from a wrong id of user', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middlewares.getFriends(req, res))
                .to.be.rejected;
        });
    });

    describe('update middleware unit test', function() {
        it('resolves updating user', function() {
            return middlewares.getAll(req, res)
                .then(function(data) {
                    return data;
                })
                .then(function(data) {
                    req = httpMocks.createRequest({
                        params: {
                            id: data[0]._id
                        },
                        body: {
                            name: 'middleware update change your name'
                        }
                    });
                    return chai.expect(middlewares.update(req, res))
                        .to.be.fulfilled.then(function(data) {
                           console.log(data + '\n');
                        });
                })
        });
        it('rejects updating wrong user', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                },
                body: {
                    name: 'test failed'
                }
            });
            return chai.expect(middlewares.update(req, res))
                .to.be.rejected;
        });
        /*it('rejects updating user with existing username', function() {
            return middlewares.getAll(req, res)
                .then(function(data) {
                    return data;
                })
                .then(function(data) {
                    req = httpMocks.createRequest({
                        params: {
                            id: data[0]._id
                        },
                        body: {
                            username: 'li'
                        }
                    });
                    return chai.expect(middlewares.update(req, res))
                        .to.be.fulfilled.then(function(data) {
                            console.log(data);
                        });
                })
        })*/
    });

    describe('delete middleware unit test', function() {
        it('resolves deleting user', function() {
            return middlewares.getAll(req, res)
                .then(function(data) {
                    return data;
                })
                .then(function(data) {
                    req = httpMocks.createRequest({
                        params: {
                            id: data[1]._id
                        }
                    });
                    return chai.expect(middlewares.delete(req, res))
                        .to.be.fulfilled.then(function(data) {
                           console.log(data);
                        });
                })

        });

        it('rejects deleting user', function() {
            req = httpMocks.createRequest({
                params: {
                    id: 123456
                }
            });
            return chai.expect(middlewares.delete(req, res))
                .to.be.rejected;
        });
    });
});
