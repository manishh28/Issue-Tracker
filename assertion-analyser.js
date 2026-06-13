'use strict';

function AssertionAnalyser(err) {
  let message = err.message || err;
  let assertions = [];

  if (!message) return assertions;

  let lines = message.split('\n');
  lines.forEach(l => {
    let assertion = {};
    let match = l.match(/^(\w+):\s(.+)/);
    if (match) {
      assertion.method = match[1];
      assertion.args = match[2].split(', ');
      assertions.push(assertion);
    }
  });

  return assertions;
}

module.exports = AssertionAnalyser;
