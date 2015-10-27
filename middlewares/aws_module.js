var errMod = require('./error_module');
var utilities = require('./utilities_module');
var nconf = require('nconf');
var async = require('async');
var authorization = require('./authorization_module');
var middleware;

if (nconf.get('db') === 'mongodb') middleware = require('./creations_middlewares');
else if (nconf.get('db') === 'mysql') middleware = require('./creations_middlewares_mysql');
else if (nconf.get('db') === 'rethink') middleware = require('./rethink/creations_rethink');

module.exports = function (server, AWS) {
    var s3 = new AWS.S3();

    server.get('/api/upload/:type/:mediaType', function (req, res, next) {
        var types = ['image/jpeg', 'image/png', 'audio/x-midi'];
        var type = req.params.type + '/' + req.params.mediaType;

        if (types.indexOf(type) === -1)
            return res.status(400).json('invalid type');

        var key = new Date().getTime().toString() + Math.random().toString();
        var fileName = req.params.type + '/' + key;
        var uploadParams = {
            Bucket: nconf.get('amazon').bucket,
            Key: fileName,
            ContentType: type
        };
        s3.getSignedUrl('putObject', uploadParams, function (err, url) {
            if (err) return res.status(500).json(err.message);
            return res.status(200).json({
                urlPut: url,
                urlGet: nconf.get('amazon').url + nconf.get('amazon').bucket + '/' + fileName
            });
        });
    });

    server.post('/api/deleteAwsCreation/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        utilities.isCreatorOrAdmin(middleware.getCreator, 'creations'),
        function (req, res, next) {
            middleware.getById(req, res)
                .then(function (data) {
                    if (data.picture) req.awsKeyPicture = utilities.getAwsKey(data.picture);
                    if (data.url) req.awsKeyCreation = utilities.getAwsKey(data.url);
                    return next();
                })
                .catch(function (err) {
                    return res.status(500).json(err);
                })
        },
        function (req, res) {
            if (!req.awsKeyPicture && !req.awsKeyCreation) return res.status(400).json('Missing key');

            async.parallel([deletePicture, deleteCreation], function (err) {
                if (err) return res.status(500).json(err);
                else return res.status(200).json('delete media ok');
            });

            function deletePicture(callback) {
               delS3Object(req.awsKeyPicture, callback);
            }

            function deleteCreation(callback) {
                delS3Object(req.awsKeyCreation, callback);
            }

            function delS3Object(key, callback) {
                var deleteParams;

                if (!key) callback();
                else {
                    deleteParams = {Bucket: nconf.get('amazon').bucket, Key: key};
                    s3.deleteObject(deleteParams, function (err) {
                        if (err) callback(err);
                        callback();
                    });
                }
            }
        }
    );
};
