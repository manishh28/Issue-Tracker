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

      // Create a root suite to nest tests under
      const rootSuite = mocha.suite;

      global.suite = function (name, fn) {
        const suite = new Mocha.Suite(name, rootSuite.ctx);
        suite.timeout(10000);
        rootSuite.addSuite(suite);
        // Make test() add to THIS suite
        global.test = function (tname, tfn) {
          suite.addTest(new Mocha.Test(tname, tfn));
        };
        fn.call(suite);
      };

      global.test     = function (name, fn) { rootSuite.addTest(new Mocha.Test(name, fn)); };
      global.before   = function (fn) { rootSuite.beforeAll(fn); };
      global.after    = function (fn) { rootSuite.afterAll(fn); };
      global.beforeEach = function (fn) { rootSuite.beforeEach(fn); };
      global.afterEach  = function (fn) { rootSuite.afterEach(fn); };

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
