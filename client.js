'use strict';

const state = {
  project: 'fcc-project',
  filters: {}
};

const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const activeProject = document.getElementById('active-project');
const createForm = document.getElementById('create-form');
const filterForm = document.getElementById('filter-form');
const clearFiltersButton = document.getElementById('clear-filters');
const refreshButton = document.getElementById('refresh-button');
const issuesContainer = document.getElementById('issues');
const message = document.getElementById('message');

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

function apiPath(project = state.project, query = '') {
  return `/api/issues/${encodeURIComponent(project)}${query}`;
}

function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => String(value).trim() !== ''));
}

async function request(method, path, body) {
  const options = { method };

  if (body) {
    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    options.body = new URLSearchParams(body);
  }

  const response = await fetch(path, options);
  return response.json();
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function renderEmpty() {
  issuesContainer.innerHTML = '<div class="issue-card"><p>No issues match this project and filter.</p></div>';
}

function renderIssues(issues) {
  issuesContainer.innerHTML = '';

  if (issues.length === 0) {
    renderEmpty();
    return;
  }

  for (const issue of issues) {
    const card = document.createElement('article');
    card.className = 'issue-card';
    card.innerHTML = `
      <header>
        <h3></h3>
        <span class="status-pill ${issue.open ? 'open' : 'closed'}"></span>
      </header>
      <p></p>
      <div class="meta-grid">
        <div><span>ID</span><strong class="issue-id"></strong></div>
        <div><span>Created by</span><strong class="created-by"></strong></div>
        <div><span>Assigned</span><strong class="assigned-to"></strong></div>
        <div><span>Status</span><strong class="status-text"></strong></div>
        <div><span>Created</span><strong class="created-on"></strong></div>
        <div><span>Updated</span><strong class="updated-on"></strong></div>
      </div>
      <form class="issue-actions">
        <label>
          Assigned
          <input name="assigned_to">
        </label>
        <label>
          Status
          <input name="status_text">
        </label>
        <label>
          Open
          <select name="open">
            <option value="true">Open</option>
            <option value="false">Closed</option>
          </select>
        </label>
        <button type="submit">Update</button>
        <button class="delete-button" type="button">Delete</button>
      </form>
    `;

    card.querySelector('h3').textContent = issue.issue_title;
    card.querySelector('.status-pill').textContent = issue.open ? 'Open' : 'Closed';
    card.querySelector('p').textContent = issue.issue_text;
    card.querySelector('.issue-id').textContent = issue._id;
    card.querySelector('.created-by').textContent = issue.created_by;
    card.querySelector('.assigned-to').textContent = issue.assigned_to || 'Unassigned';
    card.querySelector('.status-text').textContent = issue.status_text || 'No status';
    card.querySelector('.created-on').textContent = formatDate(issue.created_on);
    card.querySelector('.updated-on').textContent = formatDate(issue.updated_on);
    card.querySelector('[name="assigned_to"]').value = issue.assigned_to;
    card.querySelector('[name="status_text"]').value = issue.status_text;
    card.querySelector('[name="open"]').value = String(issue.open);

    card.querySelector('.issue-actions').addEventListener('submit', async (event) => {
      event.preventDefault();
      const updates = formDataToObject(event.currentTarget);
      const result = await request('PUT', apiPath(), { _id: issue._id, ...updates });
      setMessage(result.error || result.result, Boolean(result.error));
      await loadIssues();
    });

    card.querySelector('.delete-button').addEventListener('click', async () => {
      const result = await request('DELETE', apiPath(), { _id: issue._id });
      setMessage(result.error || result.result, Boolean(result.error));
      await loadIssues();
    });

    issuesContainer.append(card);
  }
}

async function loadIssues() {
  activeProject.textContent = state.project;
  const query = new URLSearchParams(state.filters).toString();
  const issues = await request('GET', apiPath(state.project, query ? `?${query}` : ''));
  renderIssues(issues);
  setMessage(`${issues.length} issue${issues.length === 1 ? '' : 's'} loaded`);
}

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const project = projectNameInput.value.trim();
  if (!project) return;
  state.project = project;
  state.filters = {};
  filterForm.reset();
  await loadIssues();
});

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = formDataToObject(createForm);
  const result = await request('POST', apiPath(), payload);
  setMessage(result.error || `Created ${result._id}`, Boolean(result.error));

  if (!result.error) {
    createForm.reset();
    await loadIssues();
  }
});

filterForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  state.filters = compactObject(formDataToObject(filterForm));
  await loadIssues();
});

clearFiltersButton.addEventListener('click', async () => {
  filterForm.reset();
  state.filters = {};
  await loadIssues();
});

refreshButton.addEventListener('click', loadIssues);

loadIssues();
