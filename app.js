var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var mysql = require('mysql');
var AWS = require('aws-sdk');
var nconf = require('nconf');

require('./middlewares/config_module')(nconf, AWS);
var r = require('./middlewares/rethink/rethink_module');

var app = express();

var routes = require('./routes/index');
var users = require('./routes/users');
var creations = require('./routes/creations');
var comments = require('./routes/comments');
var groups = require('./routes/groups');
var room = require('./routes/room');


if(nconf.get('db') === 'mongodb') {
    mongoose.connect('mongodb://localhost/orphee');
}
else if (nconf.get('db') === 'mysql') {
    var pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'superphung',
        database: 'Orphee'
    });
    app.use(function(req, res, next) {
        req.mysql = pool;
        next();
    });
}

if (nconf.get('db') === 'rethink')
    app.use(r.createConnection);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

require('./middlewares/auth_module')(app);
require('./middlewares/aws_module')(app, AWS);
require('./middlewares/notification_module')(app);
require('./middlewares/friend_module')(app);
require('./middlewares/like_module')(app);
app.use('/', routes);
app.use('/api', users);
app.use('/api', creations);
app.use('/api', comments);
app.use('/api', groups);
app.use('/api', room);

if (nconf.get('db') === 'rethink')
    app.use(r.closeConnection);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
