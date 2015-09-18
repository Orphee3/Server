/**
 * Created by Eric on 25/03/2015.
 */

module.exports = function(nconf, AWS) {
	nconf.file({
		file: 'config.json'
	});

    nconf.defaults({
        'db': 'mongodb'
        //'db': 'mysql'
        //'db': 'rethink'
    });

    AWS.config.update({
        accessKeyId: nconf.get('amazon').accessKeyId,
        secretAccessKey: nconf.get('amazon').secretAccessKey,
        region: nconf.get('amazon').region
    });
};