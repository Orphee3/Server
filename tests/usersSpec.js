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
                    console.log(data);
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
                           console.log(data);
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
        })
    })
});
