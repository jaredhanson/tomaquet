/**
 * Module dependencies.
 */
var mqtt = require('mqtt')
  , debug = require('debug')('tomaquet');


// prototype
var app = exports = module.exports = {};

app.init = function(){
  this._stack = [];
  //this.defaultConfiguration();
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
  debug('use %s %s', topic || '*', fn.name || 'anonymous');
  this._stack.push({ topic: topic, handle: fn });
  return this;
}

app.connect = function(options) {
  var conn = mqtt.createClient();
  this.setupClient(conn);
  return conn;
}

app.subscribe = function(topic, opts, cb) {
  if (!this.connection.subscribe) throw new Error('Cannot send subscribe command on server connection.');  
  this.connection.subscribe(topic, opts, cb);
  return this;
}

app.setupClient = function(client) {
  this.connection = client;
  
  var self = this;
  client.on('message', function(topic, message) {
    self.handle({ topic: topic, payload: message });
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
  
  function next(err) {
    var layer = stack[idx++];
    
    // TODO: check that topic matches, if specified
    
    // all done
    if (!layer) {
      // delegate to parent
      if (out) { return out(err); }
      // TODO: Handle unhandled messages as necessary
      return;
    }
    
    try {
      debug('%s', layer.handle.name || 'anonymous');
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
