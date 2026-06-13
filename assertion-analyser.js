'use strict';

function assertionAnalyser(err) {
  if (!err) return [];

  let assertions = [];
  let message = err.message || String(err);

  // Each chai assertion failure becomes one entry
  assertions.push({
    method: 'assert',
    args: [message]
  });

  return assertions;
}

module.exports = assertionAnalyser;
