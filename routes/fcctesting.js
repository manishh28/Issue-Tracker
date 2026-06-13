'use strict';

module.exports = function (app) {
  app.route('/_api/app-info').get(function (req, res) {
    const routes = app._router.stack
      .filter(r => r.route)
      .map(r => r.route.path);
    res.json({ routes });
  });

  app.route('/_api/get-tests').get(function (req, res) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');

    try {
      const Mocha = require('mocha');
      const path  = require('path');
      const mocha = new Mocha({ timeout: 10000 });

      global.suite = function (name, fn) {
        const s = Mocha.Suite.create(mocha.suite, name);
        s.timeout(10000);
        fn.call(s);
      };
      global.test      = function (name, fn) { mocha.suite.addTest(new Mocha.Test(name, fn)); };
      global.before    = function (fn) { mocha.suite.beforeAll(fn); };
      global.after     = function (fn) { mocha.suite.afterAll(fn); };
      global.beforeEach = function (fn) { mocha.suite.beforeEach(fn); };
      global.afterEach  = function (fn) { mocha.suite.afterEach(fn); };

      const testFile = path.join(process.cwd(), 'tests', '2_functional-tests.js');
      delete require.cache[require.resolve(testFile)];
      require(testFile);

      const output = [];
      mocha.run()
        .on('pass', test => output.push({ title: test.fullTitle(), state: 'passed' }))
        .on('fail', (test, err) => output.push({ title: test.fullTitle(), state: 'failed', err: err.message }))
        .on('end', () => res.json(output));
    } catch (err) {
      console.error('Test runner error:', err);
      res.status(500).json({ error: err.message });
    }
  });
};
