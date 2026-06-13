'use strict';

const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  project:     { type: String, required: true },
  issue_title: { type: String, required: true },
  issue_text:  { type: String, required: true },
  created_by:  { type: String, required: true },
  assigned_to: { type: String, default: '' },
  status_text: { type: String, default: '' },
  open:        { type: Boolean, default: true },
  created_on:  { type: Date, default: Date.now },
  updated_on:  { type: Date, default: Date.now }
});

const Issue = mongoose.model('Issue', issueSchema);

module.exports = function (app) {

  app.route('/api/issues/:project')

    .get(async function (req, res) {
      const project = req.params.project;
      const filter = { project };
      const allowed = ['issue_title','issue_text','created_by','assigned_to','status_text','open','_id'];
      allowed.forEach(field => {
        if (req.query[field] !== undefined) {
          if (field === 'open') filter.open = req.query.open === 'true';
          else if (field === '_id' && mongoose.Types.ObjectId.isValid(req.query._id)) filter._id = req.query._id;
          else filter[field] = req.query[field];
        }
      });
      try {
        const issues = await Issue.find(filter).select('-project -__v');
        res.json(issues);
      } catch (err) {
        res.json({ error: 'could not get issues' });
      }
    })

    .post(async function (req, res) {
      const project = req.params.project;
      const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;
      if (!issue_title || !issue_text || !created_by) {
        return res.json({ error: 'required field(s) missing' });
      }
      try {
        const issue = new Issue({
          project,
          issue_title,
          issue_text,
          created_by,
          assigned_to: assigned_to || '',
          status_text: status_text || '',
          open: true,
          created_on: new Date(),
          updated_on: new Date()
        });
        const saved = await issue.save();
        res.json({
          _id:         saved._id,
          issue_title: saved.issue_title,
          issue_text:  saved.issue_text,
          created_by:  saved.created_by,
          assigned_to: saved.assigned_to,
          status_text: saved.status_text,
          open:        saved.open,
          created_on:  saved.created_on,
          updated_on:  saved.updated_on
        });
      } catch (err) {
        res.json({ error: 'could not create issue' });
      }
    })

    .put(async function (req, res) {
      const { _id, issue_title, issue_text, created_by, assigned_to, status_text, open } = req.body;
      if (!_id) return res.json({ error: 'missing _id' });
      const updates = {};
      if (issue_title !== undefined && issue_title !== '') updates.issue_title = issue_title;
      if (issue_text  !== undefined && issue_text  !== '') updates.issue_text  = issue_text;
      if (created_by  !== undefined && created_by  !== '') updates.created_by  = created_by;
      if (assigned_to !== undefined && assigned_to !== '') updates.assigned_to = assigned_to;
      if (status_text !== undefined && status_text !== '') updates.status_text = status_text;
      if (open        !== undefined && open        !== '') updates.open        = open === 'true' || open === true;
      if (Object.keys(updates).length === 0) return res.json({ error: 'no update field(s) sent', _id });
      if (!mongoose.Types.ObjectId.isValid(_id)) return res.json({ error: 'could not update', _id });
      updates.updated_on = new Date();
      try {
        const updated = await Issue.findByIdAndUpdate(_id, { $set: updates }, { new: true });
        if (!updated) return res.json({ error: 'could not update', _id });
        res.json({ result: 'successfully updated', _id });
      } catch (err) {
        res.json({ error: 'could not update', _id });
      }
    })

    .delete(async function (req, res) {
      const { _id } = req.body;
      if (!_id) return res.json({ error: 'missing _id' });
      if (!mongoose.Types.ObjectId.isValid(_id)) return res.json({ error: 'could not delete', _id });
      try {
        const deleted = await Issue.findByIdAndDelete(_id);
        if (!deleted) return res.json({ error: 'could not delete', _id });
        res.json({ result: 'successfully deleted', _id });
      } catch (err) {
        res.json({ error: 'could not delete', _id });
      }
    });
};
