/**
 * Created by superphung on 8/18/15.
 */

exports.error = error;
exports.notAuthorized = notAuthorized;

function error(socket, err) {
    socket.emit('error', new Error(err));
}

function notAuthorized(socket) {
    socket.emit('unauthorized');
    socket.disconnect();
}