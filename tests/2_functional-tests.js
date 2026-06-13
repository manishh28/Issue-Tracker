const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

let testId1;
let testId2;

suite('Functional Tests', function () {
  this.timeout(10000);

  test('Create an issue with every field', function (done) {
    chai.request(server)
      .post('/api/issues/testproject')
      .send({
        issue_title: 'Full Issue',
        issue_text: 'This is the full issue text',
        created_by: 'Tester',
        assigned_to: 'Dev',
        status_text: 'In progress'
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.issue_title, 'Full Issue');
        assert.equal(res.body.issue_text, 'This is the full issue text');
        assert.equal(res.body.created_by, 'Tester');
        assert.equal(res.body.assigned_to, 'Dev');
        assert.equal(res.body.status_text, 'In progress');
        assert.equal(res.body.open, true);
        assert.property(res.body, '_id');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'updated_on');
        testId1 = res.body._id.toString();
        done();
      });
  });

  test('Create an issue with only required fields', function (done) {
    chai.request(server)
      .post('/api/issues/testproject')
      .send({
        issue_title: 'Required Only Issue',
        issue_text: 'Only required fields provided',
        created_by: 'Tester'
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.issue_title, 'Required Only Issue');
        assert.equal(res.body.assigned_to, '');
        assert.equal(res.body.status_text, '');
        assert.equal(res.body.open, true);
        assert.property(res.body, '_id');
        testId2 = res.body._id.toString();
        done();
      });
  });

  test('Create an issue with missing required fields', function (done) {
    chai.request(server)
      .post('/api/issues/testproject')
      .send({ issue_title: 'Missing Fields Issue' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.error, 'required field(s) missing');
        done();
      });
  });

  test('View issues on a project', function (done) {
    chai.request(server)
      .get('/api/issues/testproject')
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAbove(res.body.length, 0);
        assert.property(res.body[0], '_id');
        assert.property(res.body[0], 'issue_title');
        assert.property(res.body[0], 'issue_text');
        assert.property(res.body[0], 'created_by');
        assert.property(res.body[0], 'assigned_to');
        assert.property(res.body[0], 'status_text');
        assert.property(res.body[0], 'open');
        assert.property(res.body[0], 'created_on');
        assert.property(res.body[0], 'updated_on');
        done();
      });
  });

  test('View issues on a project with one filter', function (done) {
    chai.request(server)
      .get('/api/issues/testproject')
      .query({ open: true })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        res.body.forEach(issue => assert.equal(issue.open, true));
        done();
      });
  });

  test('View issues on a project with multiple filters', function (done) {
    chai.request(server)
      .get('/api/issues/testproject')
      .query({ open: true, created_by: 'Tester' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        res.body.forEach(issue => {
          assert.equal(issue.open, true);
          assert.equal(issue.created_by, 'Tester');
        });
        done();
      });
  });

  test('Update one field on an issue', function (done) {
    chai.request(server)
      .put('/api/issues/testproject')
      .send({ _id: testId1, issue_title: 'Updated Title' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.result, 'successfully updated');
        assert.equal(res.body._id.toString(), testId1);
        done();
      });
  });

  test('Update multiple fields on an issue', function (done) {
    chai.request(server)
      .put('/api/issues/testproject')
      .send({ _id: testId1, issue_title: 'Multi Update', issue_text: 'Multi text', open: false })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.result, 'successfully updated');
        assert.equal(res.body._id.toString(), testId1);
        done();
      });
  });

  test('Update an issue with missing _id', function (done) {
    chai.request(server)
      .put('/api/issues/testproject')
      .send({ issue_title: 'No ID' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.error, 'missing _id');
        done();
      });
  });

  test('Update an issue with no fields to update', function (done) {
    chai.request(server)
      .put('/api/issues/testproject')
      .send({ _id: testId1 })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.error, 'no update field(s) sent');
        assert.equal(res.body._id.toString(), testId1);
        done();
      });
  });

  test('Update an issue with an invalid _id', function (done) {
    chai.request(server)
      .put('/api/issues/testproject')
      .send({ _id: 'invalid_id_string', issue_title: 'Test' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.error, 'could not update');
        done();
      });
  });

  test('Delete an issue', function (done) {
    chai.request(server)
      .delete('/api/issues/testproject')
      .send({ _id: testId2 })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.result, 'successfully deleted');
        assert.equal(res.body._id.toString(), testId2);
        done();
      });
  });

  test('Delete an issue with an invalid _id', function (done) {
    chai.request(server)
      .delete('/api/issues/testproject')
      .send({ _id: 'invalid_id_string' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.error, 'could not delete');
        done();
      });
  });

  test('Delete an issue with missing _id', function (done) {
    chai.request(server)
      .delete('/api/issues/testproject')
      .send({})
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.error, 'missing _id');
        done();
      });
  });
});
