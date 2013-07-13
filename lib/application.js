/**
 * Module dependencies.
 */
var mqtt = require('mqtt')
  , Router = require('./router')
  , configurable = require('configurable')
  , debug = require('debug')('tomaquet');


/**
 * Application prototype.
 */
var app = exports = module.exports = {};
configurable(app);

app.init = function() {
  this.topic = '';
  this.settings = {};
  this._stack = [];
  this._router = new Router();
  this.defaultConfiguration();
};

app.defaultConfiguration = function(){
  this.set('env', process.env.NODE_ENV || 'development');
  this.set('case sensitive routing', true);
  debug('booting in %s mode', this.get('env'));
  
  // router
  this.routes = this._router.map;
  this.__defineGetter__('router', function() {
    this._usedRouter = true;
    this._router.caseSensitive = this.enabled('case sensitive routing');
    this._router.strict = this.enabled('strict routing');
    return this._router.middleware;
  });
};

app.use = function(topic, fn) {
  if ('string' != typeof topic) {
    fn = topic;
    topic = '';
  }
  
  // wrap sub-apps
  if ('function' == typeof fn.handle) {
    var server = fn;
    server.topic = topic;
    fn = function(msg, next) {
      server.handle(msg, next);
    };
  }
  
  // add the middleware
  debug('use %s %s', topic || '#', fn.name || 'anonymous');
  this._stack.push({ topic: topic, handle: fn });
  return this;
}

/**
 * Delegate `.COMMAND(...)` calls to `router.route(COMMAND, ...)`.
 */
var commands = require('./commands');

commands.forEach(function(cmd) {
  app[cmd] = function(node) {
    var args = [cmd].concat([].slice.call(arguments));
    
    // if no router attached yet, attach the router
    if (!this._usedRouter) { this.use(this.router); }
    
    // setup route
    this._router.route.apply(this._router, args);
    return this;
  }
});

app.msg =
app.message =
app.pub = app.publish;
app.sub = app.subscribe;



app.connect = function(options) {
  var conn = mqtt.createClient();
  this.setupClient(conn);
  return conn;
}

app.subscribeTo = function(topic, opts, cb) {
  if (!this.connection.subscribe) throw new Error('Cannot send subscribe command on server connection');  
  this.connection.subscribe.apply(this.connection, arguments);
  return this;
}

app.setupClient = function(client) {
  this.connection = client;
  
  var self = this;
  client.on('message', function(topic, message) {
    self.handle({ cmd: 'publish', topic: topic, payload: message });
  });
}

app.handle = function(msg, out) {
  var self = this
    , stack = this._stack
    , idx = 0;
  
  // `handle()` can potentially be invoked multiple times, if apps are mounted
  // as sub-apps.  However, only the outer-most app is bound to an underlying
  // MQTT connection.
  if (this.connection) {
    msg.connection = this.connection;
  }
  
  function next(err, rv) {
    var layer = stack[idx++];
    
    // all done
    if (!layer) {
      // delegate to parent
      if (out) { return out(err, rv); }
      // TODO: Implement default behavior for unhandled messages.
      if (err) {
        console.error(err.stack);
      }
      return;
    }
    
    try {
      // skip this layer if the topic doesn't match, noting that MQTT topic
      // names are case sensitive
      if (0 != msg.topic.indexOf(layer.topic)) return next(err);
      
      debug('%s %s', layer.handle.name || 'anonymous', layer.topic);
      var arity = layer.handle.length;
      if (err) {
        if (arity == 3) {
          layer.handle(err, msg, next);
        } else {
          next(err);
        }
      } else if (arity < 3) {
        layer.handle(msg, next);
      } else {
        next();
      }
    } catch (ex) {
      next(ex);
    }
  }
  next();
}
