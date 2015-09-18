var errMod = require('./error_module');
var utilities = require('./utilities_module');
var nconf = require('nconf');
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

    server.post('/api/delete/:id',
        authorization.validateToken({secret: nconf.get('secret')}),
        utilities.isCreatorOrAdmin(middleware.getCreator, 'creations'),
        function (req, res, next) {
            middleware.getById(req, res)
                .then(function (data) {
                    req.awsKey = data.awsKey;
                    return next();
                })
                .catch(function (err) {
                    return next(err);
                })
        },
        function (req, res, next) {
            if (!req.awsKey)
                return next(errMod.getError('Missing key', 400));
            var deleteParams = {Bucket: nconf.get('amazon').bucket, Key: req.awsKey};
            s3.deleteObject(deleteParams, function (err, data) {
                if (err) return next(errMod.getError(err, 500));
                return res.status(200).json({url: data});
            });
        });
};
