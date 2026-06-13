'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createServer, resetStore } = require('../server');

let server;
let baseUrl;
let project;
let issueWithEveryField;
let issueWithRequiredFields;

function issueUrl(query = '') {
  return `${baseUrl}/api/issues/${project}${query}`;
}

async function sendRequest(method, url, body) {
  const options = { method };

  if (body) {
    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    options.body = new URLSearchParams(body);
  }

  const response = await fetch(url, options);
  const json = await response.json();
  return { response, json };
}

test.before(async () => {
  resetStore();
  project = `functional-tests-${Date.now()}`;
  server = createServer();

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('Create an issue with every field: POST request to /api/issues/{project}', async () => {
  const { response, json } = await sendRequest('POST', issueUrl(), {
    issue_title: 'Every field issue',
    issue_text: 'The submitter filled out every field.',
    created_by: 'Ada',
    assigned_to: 'Linus',
    status_text: 'Waiting for review'
  });

  assert.equal(response.status, 200);
  assert.equal(json.issue_title, 'Every field issue');
  assert.equal(json.issue_text, 'The submitter filled out every field.');
  assert.equal(json.created_by, 'Ada');
  assert.equal(json.assigned_to, 'Linus');
  assert.equal(json.status_text, 'Waiting for review');
  assert.equal(json.open, true);
  assert.ok(json.created_on);
  assert.ok(json.updated_on);
  assert.ok(json._id);

  issueWithEveryField = json;
});

test('Create an issue with only required fields: POST request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('POST', issueUrl(), {
    issue_title: 'Required only issue',
    issue_text: 'The submitter used only the required fields.',
    created_by: 'Grace'
  });

  assert.equal(json.issue_title, 'Required only issue');
  assert.equal(json.issue_text, 'The submitter used only the required fields.');
  assert.equal(json.created_by, 'Grace');
  assert.equal(json.assigned_to, '');
  assert.equal(json.status_text, '');
  assert.equal(json.open, true);
  assert.ok(json.created_on);
  assert.ok(json.updated_on);
  assert.ok(json._id);

  issueWithRequiredFields = json;
});

test('Create an issue with missing required fields: POST request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('POST', issueUrl(), {
    issue_title: 'Missing created_by',
    issue_text: 'This should fail.'
  });

  assert.deepEqual(json, { error: 'required field(s) missing' });
});

test('View issues on a project: GET request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('GET', issueUrl());

  assert.equal(Array.isArray(json), true);
  assert.ok(json.length >= 2);
  assert.ok(json.some((issue) => issue._id === issueWithEveryField._id));
  assert.ok(json.some((issue) => issue._id === issueWithRequiredFields._id));

  for (const issue of json) {
    assert.ok(Object.hasOwn(issue, 'assigned_to'));
    assert.ok(Object.hasOwn(issue, 'status_text'));
    assert.ok(Object.hasOwn(issue, 'open'));
    assert.ok(Object.hasOwn(issue, '_id'));
    assert.ok(Object.hasOwn(issue, 'issue_title'));
    assert.ok(Object.hasOwn(issue, 'issue_text'));
    assert.ok(Object.hasOwn(issue, 'created_by'));
    assert.ok(Object.hasOwn(issue, 'created_on'));
    assert.ok(Object.hasOwn(issue, 'updated_on'));
  }
});

test('View issues on a project with one filter: GET request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('GET', issueUrl('?assigned_to=Linus'));

  assert.equal(Array.isArray(json), true);
  assert.ok(json.length >= 1);
  assert.ok(json.every((issue) => issue.assigned_to === 'Linus'));
  assert.ok(json.some((issue) => issue._id === issueWithEveryField._id));
});

test('View issues on a project with multiple filters: GET request to /api/issues/{project}', async () => {
  const query = '?issue_title=Every+field+issue&assigned_to=Linus&open=true';
  const { json } = await sendRequest('GET', issueUrl(query));

  assert.equal(Array.isArray(json), true);
  assert.equal(json.length, 1);
  assert.equal(json[0]._id, issueWithEveryField._id);
});

test('Update one field on an issue: PUT request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('PUT', issueUrl(), {
    _id: issueWithEveryField._id,
    status_text: 'Reviewed'
  });

  assert.deepEqual(json, { result: 'successfully updated', _id: issueWithEveryField._id });

  const { json: issues } = await sendRequest('GET', issueUrl(`?_id=${issueWithEveryField._id}`));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].status_text, 'Reviewed');
});

test('Update multiple fields on an issue: PUT request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('PUT', issueUrl(), {
    _id: issueWithRequiredFields._id,
    assigned_to: 'Katherine',
    status_text: 'Closed after triage',
    open: 'false'
  });

  assert.deepEqual(json, { result: 'successfully updated', _id: issueWithRequiredFields._id });

  const { json: issues } = await sendRequest('GET', issueUrl(`?_id=${issueWithRequiredFields._id}`));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].assigned_to, 'Katherine');
  assert.equal(issues[0].status_text, 'Closed after triage');
  assert.equal(issues[0].open, false);
});

test('Update an issue with missing _id: PUT request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('PUT', issueUrl(), {
    issue_title: 'No id sent'
  });

  assert.deepEqual(json, { error: 'missing _id' });
});

test('Update an issue with no fields to update: PUT request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('PUT', issueUrl(), {
    _id: issueWithEveryField._id
  });

  assert.deepEqual(json, { error: 'no update field(s) sent', _id: issueWithEveryField._id });
});

test('Update an issue with an invalid _id: PUT request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('PUT', issueUrl(), {
    _id: 'not-a-real-id',
    issue_title: 'Cannot update this'
  });

  assert.deepEqual(json, { error: 'could not update', _id: 'not-a-real-id' });
});

test('Delete an issue: DELETE request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('DELETE', issueUrl(), {
    _id: issueWithEveryField._id
  });

  assert.deepEqual(json, { result: 'successfully deleted', _id: issueWithEveryField._id });

  const { json: issues } = await sendRequest('GET', issueUrl(`?_id=${issueWithEveryField._id}`));
  assert.equal(issues.length, 0);
});

test('Delete an issue with an invalid _id: DELETE request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('DELETE', issueUrl(), {
    _id: 'not-a-real-id'
  });

  assert.deepEqual(json, { error: 'could not delete', _id: 'not-a-real-id' });
});

test('Delete an issue with missing _id: DELETE request to /api/issues/{project}', async () => {
  const { json } = await sendRequest('DELETE', issueUrl());

  assert.deepEqual(json, { error: 'missing _id' });
});
