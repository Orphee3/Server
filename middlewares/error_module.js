/**
 * Created by superphung on 3/1/15.
 */

exports.getError = function(err, code) {
    var error = new Error(err);
    error.status = code;
    return error;
};