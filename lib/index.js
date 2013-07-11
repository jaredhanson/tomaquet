/**
 * Module dependencies.
 */
var application = require('./application')
  , utils = require('./utils');


/**
 * Create an application.
 *
 * @return {Function}
 * @api public
 */
function create() {
  function app(msg) { app.handle(msg); }
  utils.merge(app, application);
  app.init();
  for (var i = 0; i < arguments.length; ++i) {
    app.use(arguments[i]);
  }
  return app;
}

/**
 * Expose create() as the module.
 */
exports = module.exports = create;

/**
 * Expose `.create()` as module method.
 */
exports.create = create;
