var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const join = require('path').join;
var bodyParser = require('body-parser');
const fs = require('fs');

var app = express();
global.__basedir = __dirname;

const services = join(__dirname, 'services');
const routes = join(__dirname, 'routes');
const controllers = join(__dirname, 'controller');
const config = join(__dirname, 'config');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var redisConfigFile = require('./environment/redis');

var session = require('express-session');
var redisStore = require('connect-redis')(session);

app.use(session({
  secret: redisConfigFile.getSessionEncryptionKey(),
  // create new redis store.
  store: new redisStore({
    client: redisConfigFile.redisConn,
    db: 0 /*, ttl: 60 * 15 */
  }),
  saveUninitialized: true,
  resave: true,
  name: 'connect.cid',
  rolling: true,
  cookie: {
    secure: false,
    maxAge: null,
    SameSite: false,
    domain: 'localhost'
  }
}));

global.services = {};
global.controllers = {};
global.config = {};

// Bootstrap services
fs.readdirSync(services)
  .forEach(file => {
    if (file.indexOf('Base') != 0) {
      stats = fs.lstatSync(join(services, file));
      if (!stats.isDirectory()) {
        var _fileName = file.substr(0, file.lastIndexOf(".js"));
        var _serviceName = _fileName[0].toLowerCase() + _fileName.substr(1);
        global.services[_serviceName] = require(join(services, file))();
      }
    }
  });

  // Bootstrap routes
fs.readdirSync(routes)
.forEach(file => {
  stats = fs.lstatSync(join(routes, file));
  if (!stats.isDirectory()) {
    console.log(`Bootstraped : ${join(routes, file)}`);
    require(join(routes, file))(app);
  }
});

// Bootstrap controllers
fs.readdirSync(controllers)
  .forEach(file => {
    stats = fs.lstatSync(join(controllers, file));
    if (!stats.isDirectory()) {
      var _fileName = file.substr(0, file.lastIndexOf(".js"));
      var _controllerName = _fileName[0].toLowerCase() + _fileName.substr(1);
      global.controllers[_controllerName] = require(join(controllers, file));
    }
  });

// Bootstrap config
fs.readdirSync(config)
  .forEach(file => {
    stats = fs.lstatSync(join(config, file));
    if (!stats.isDirectory()) {
      var _fileName = file.substr(0, file.lastIndexOf(".js"));
      var _controllerName = _fileName[0].toLowerCase() + _fileName.substr(1);
      global.config[_controllerName] = require(join(config, file));
    }
  });

app.options('/*', function (req, res) {
  res.send();
});

process.on('unhandledRejection', error => {
  console.log('unhandledRejection', error.stack);
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json(setErrorMsg("unknown failure"));
});

module.exports = app;