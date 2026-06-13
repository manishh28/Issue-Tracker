'use strict';

const testRunner = require('../test-runner');

module.exports = function(app) {
  app.route('/_api/app-info').get(function(req, res) {
    const routes = app._router.stack
      .filter(r => r.route)
      .map(r => r.route.path);
    res.json({ routes });
  });

  app.route('/_api/get-tests').get(testRunner.get(app));
};
