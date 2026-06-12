'use strict';

const crypto = require('node:crypto');

const projects = new Map();
const REQUIRED_FIELDS = ['issue_title', 'issue_text', 'created_by'];
const UPDATE_FIELDS = ['issue_title', 'issue_text', 'created_by', 'assigned_to', 'status_text', 'open'];

function sendJson(res, data, statusCode = 200) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function getProjectName(url) {
  return decodeURIComponent(url.pathname.replace(/^\/api\/issues\/?/, '')).trim();
}

function getProjectIssues(projectName) {
  if (!projects.has(projectName)) {
    projects.set(projectName, []);
  }

  return projects.get(projectName);
}

function createId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(12).toString('hex');
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeOpen(value) {
  if (typeof value === 'boolean') return value;
  if (String(value).toLowerCase() === 'false') return false;
  return true;
}

function serializeIssue(issue) {
  return {
    assigned_to: issue.assigned_to,
    status_text: issue.status_text,
    open: issue.open,
    _id: issue._id,
    issue_title: issue.issue_title,
    issue_text: issue.issue_text,
    created_by: issue.created_by,
    created_on: issue.created_on,
    updated_on: issue.updated_on
  };
}

function parseUrlEncodedBody(rawBody) {
  const params = new URLSearchParams(rawBody);
  const body = {};

  for (const [key, value] of params) {
    body[key] = value;
  }

  return body;
}

function parseJsonBody(rawBody) {
  if (!rawBody.trim()) return {};

  try {
    const parsed = JSON.parse(rawBody);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      resolve(contentType.includes('application/json') ? parseJsonBody(body) : parseUrlEncodedBody(body));
    });
    req.on('error', reject);
  });
}

function matchesFilter(issue, key, value) {
  if (key === 'open') {
    return issue.open === normalizeOpen(value);
  }

  return String(issue[key] ?? '') === value;
}

async function createIssue(req, res, projectName) {
  const body = await collectBody(req);
  const missingRequiredField = REQUIRED_FIELDS.some((field) => !hasValue(body[field]));

  if (missingRequiredField) {
    sendJson(res, { error: 'required field(s) missing' });
    return;
  }

  const now = new Date().toISOString();
  const issue = {
    assigned_to: hasValue(body.assigned_to) ? String(body.assigned_to) : '',
    status_text: hasValue(body.status_text) ? String(body.status_text) : '',
    open: true,
    _id: createId(),
    issue_title: String(body.issue_title),
    issue_text: String(body.issue_text),
    created_by: String(body.created_by),
    created_on: now,
    updated_on: now
  };

  getProjectIssues(projectName).push(issue);
  sendJson(res, serializeIssue(issue));
}

function listIssues(res, url, projectName) {
  const filters = Array.from(url.searchParams.entries());
  const issues = getProjectIssues(projectName)
    .filter((issue) => filters.every(([key, value]) => matchesFilter(issue, key, value)))
    .map(serializeIssue);

  sendJson(res, issues);
}

async function updateIssue(req, res, projectName) {
  const body = await collectBody(req);
  const id = body._id;

  if (!hasValue(id)) {
    sendJson(res, { error: 'missing _id' });
    return;
  }

  const fieldsToUpdate = UPDATE_FIELDS.filter((field) => hasOwn(body, field));
  if (fieldsToUpdate.length === 0) {
    sendJson(res, { error: 'no update field(s) sent', _id: String(id) });
    return;
  }

  const issue = getProjectIssues(projectName).find((candidate) => candidate._id === String(id));
  if (!issue) {
    sendJson(res, { error: 'could not update', _id: String(id) });
    return;
  }

  for (const field of fieldsToUpdate) {
    issue[field] = field === 'open' ? normalizeOpen(body[field]) : String(body[field] ?? '');
  }
  issue.updated_on = new Date().toISOString();

  sendJson(res, { result: 'successfully updated', _id: String(id) });
}

async function deleteIssue(req, res, projectName) {
  const body = await collectBody(req);
  const id = body._id;

  if (!hasValue(id)) {
    sendJson(res, { error: 'missing _id' });
    return;
  }

  const issues = getProjectIssues(projectName);
  const issueIndex = issues.findIndex((issue) => issue._id === String(id));

  if (issueIndex === -1) {
    sendJson(res, { error: 'could not delete', _id: String(id) });
    return;
  }

  issues.splice(issueIndex, 1);
  sendJson(res, { result: 'successfully deleted', _id: String(id) });
}

async function handleApiRequest(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const projectName = getProjectName(url);
  if (!projectName) {
    sendJson(res, { error: 'project name missing' }, 404);
    return;
  }

  if (req.method === 'POST') {
    await createIssue(req, res, projectName);
    return;
  }

  if (req.method === 'GET') {
    listIssues(res, url, projectName);
    return;
  }

  if (req.method === 'PUT') {
    await updateIssue(req, res, projectName);
    return;
  }

  if (req.method === 'DELETE') {
    await deleteIssue(req, res, projectName);
    return;
  }

  sendJson(res, { error: 'method not allowed' }, 405);
}

function resetStore() {
  projects.clear();
}

module.exports = {
  handleApiRequest,
  resetStore
};
