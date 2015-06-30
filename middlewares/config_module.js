/**
 * Created by Eric on 25/03/2015.
 */

module.exports = function(nconf) {
    nconf.defaults({
        //'db': 'mongodb',
        'db': 'mysql',
        'secret': 'superphung'
    });
};
