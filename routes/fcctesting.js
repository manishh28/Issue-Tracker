'use strict';

module.exports = function (app) {
  app.route('/_api/app-info').get(function (req, res) {
    const routes = app._router.stack
      .filter(r => r.route)
      .map(r => r.route.path);
    res.json({ routes });
  });
};
