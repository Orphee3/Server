var errMod = require('./error_module');
var nconf = require('nconf');

module.exports = function (server, AWS) {
    var s3 = new AWS.S3();

    server.get('/api/upload/:type', function (req, res, next) {
        var type = req.params.type;

        if (type) {
            var match = type.match(/^image|boucle$/);
            if (match)
                type = match[0];
            else
                return next(errMod.getError('Invalid type', 400));
        }
        else
            return next(errMod.getError('No type', 400));

        var key = new Date().getTime().toString() + Math.random().toString();
        var fileName = type + '/' + key;
        var contentType;
        if (type === 'boucle') contentType = 'audio/x-midi';
        else if (type === 'image') contentType = 'image/jpeg';
        var uploadParams = {
            Bucket: nconf.get('amazon').bucket,
            Key: fileName,
            ContentType: contentType
        };
        s3.getSignedUrl('putObject', uploadParams, function (err, url) {
            if (err) return next(errMod.getError(err, 500));
            return res.status(200).json({
                urlPut: url,
                urlGet: nconf.get('amazon').url + nconf.get('amazon').bucket + '/' + fileName
            });
        });
    });
};
