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
}

/**
 * Expose `Router`.
 */
module.exports = Router;
