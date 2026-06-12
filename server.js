'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const { handleApiRequest, resetStore } = require('./routes/api');

const PUBLIC_DIR = path.join(__dirname, 'public');

function loadEnv(envPath = path.join(__dirname, '.env')) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  };

  return types[extension] || 'application/octet-stream';
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(res, 404, 'Not Found');
    return;
  }

  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': getContentType(filePath),
    'Content-Length': body.length,
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (url.pathname.startsWith('/api/issues/')) {
        await handleApiRequest(req, res, url);
        return;
      }

      serveStatic(req, res, url);
    } catch (error) {
      console.error(error);
      sendText(res, 500, 'Internal Server Error');
    }
  });
}

if (require.main === module) {
  loadEnv();

  const port = Number(process.env.PORT) || 3000;
  const server = createServer();
  server.listen(port, () => {
    console.log(`Issue Tracker listening on http://localhost:${port}`);
  });
}

module.exports = {
  createServer,
  loadEnv,
  resetStore
};
