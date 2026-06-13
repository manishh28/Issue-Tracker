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
    const path  = require('path');

    const mocha = new Mocha({ timeout: 10000 });

    // Expose suite/test/before etc. as globals before loading test file
    mocha.suite.emit('pre-require', global, '', mocha);

    const testFile = path.join(process.cwd(), 'tests', '2_functional-tests.js');
    delete require.cache[require.resolve(testFile)];
    mocha.addFile(testFile);

    const output = [];

    mocha.run()
      .on('pass', test => {
        output.push({ title: test.fullTitle(), state: 'passed' });
      })
      .on('fail', (test, err) => {
        output.push({ title: test.fullTitle(), state: 'failed', err: err.message });
      })
      .on('end', () => {
        res.json(output);
      });
  });
};
