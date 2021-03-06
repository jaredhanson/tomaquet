/**
 * Module dependencies.
 */
var Route = require('./route')
  , utils = require('./utils')
  , debug = require('debug')('tomaquet:router')


/**
 * `Router` constructor.
 *
 * @api protected
 */
function Router() {
  var self = this;
  this.map = {};
  this.caseSensitive = true;
  this.strict = false;

  this.middleware = function router(msg, next) {
    self._dispatch(msg, next);
  };
}

Router.prototype.route = function(cmd, topic, fns) {
  var cmd = cmd.toLowerCase()
    , fns = utils.flatten([].slice.call(arguments, 2));
  
  // ensure topic was given
  if (topic === undefined) throw new TypeError('Router.route() requires a topic');
  
  // ensure all handlers are functions
  fns.forEach(function(fn, i){
    if ('function' == typeof fn) return;
    var type = {}.toString.call(fn);
    var msg = 'Router.route() requires callback functions but got a ' + type;
    throw new TypeError(msg);
  });
  
  // create the route
  debug('defined %s %s', cmd, topic);
  var route = new Route(cmd, topic, fns, {
    sensitive: this.caseSensitive,
    strict: this.strict
  });
  
  // add it
  (this.map[cmd] = this.map[cmd] || []).push(route);
  return this;
};

Router.prototype._dispatch = function(msg, next) {
  debug('dispatching %s %s (%s)', msg.cmd, msg.topic, msg.originalTopic);
  
  var self = this;
  
  // route dispatch
  (function iter(i, err, rv) {
    function nextRoute(err, rv) {
      iter(i + 1, err, rv);
    }
    
    var route = self._match(msg, i);
    if (!route) { return next(err, rv); }
    
    debug('matched %s %s', route.cmd, route.topic);
    
    // invoke route callbacks
    var idx = 0;
    function callbacks(err, rv) {
      var fn = route.fns[idx++];
      try {
        if ('route' == err) {
          nextRoute();
        } else if (err && fn) {
          if (fn.length < 3) { return callbacks(err); }
          fn(err, msg, callbacks);
        } else if (fn) {
          fn(msg, callbacks);
        } else {
          nextRoute(err, rv);
        }
      } catch (err) {
        callbacks(err);
      }
    }
    callbacks();
  })(0);
}

Router.prototype._match = function(msg, i) {
  var cmd = msg.cmd
    , topic = msg.topic
    , routes = this.map
    , route
    , i = i || 0;
  
  
  // routes for this command
  if (routes = routes[cmd]) {
    // matching routes
    for (var len = routes.length; i < len; ++i) {
      route = routes[i];
      if (route.match(topic, msg.params = [])) {
        return route;
      }
    }
  }
  
  return null;
}

/**
 * Expose `Router`.
 */
module.exports = Router;
