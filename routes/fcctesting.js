'use strict';

module.exports = function (app) {
  app.route('/_api/app-info').get(function (req, res) {
    const routes = app._router.stack
      .filter(r => r.route)
      .map(r => r.route.path);
    res.json({ routes });
  });

  app.route('/_api/get-tests').get(function (req, res) {
    const Mocha = require('mocha');
    const mocha = new Mocha({ timeout: 10000 });
    mocha.addFile('./tests/2_functional-tests.js');
    const output = [];
    mocha.run()
      .on('pass', test => output.push({ title: test.fullTitle(), state: 'passed' }))
      .on('fail', (test, err) => output.push({ title: test.fullTitle(), state: 'failed', err: err.message }))
      .on('end', () => res.json(output));
  });
};
