/**
 * Created by superphung on 3/1/15.
 */

exports.getError500 = function(err) {
    var error = new Error(err);
    error.status = 500;
    return error;
};