/**
 * Module dependencies.
 */
var pattern = require('urlpattern').express;


/**
 * `Route` constructor.
 *
 * @api protected
 */
function Router(cmd, topic, fns, options) {
  options = options || {};
  this.topic = topic;
  this.cmd = cmd;
  this.fns = fns;
  this.regexp = pattern.parse(topic
    , this.keys = []
    , options.sensitive
    , options.strict);
}

/**
 * Expose `Router`.
 */
module.exports = Router;
