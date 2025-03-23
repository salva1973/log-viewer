// server.js

require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');
const { exec } = require('child_process');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 8080;
const USERNAME = process.env.LOGVIEW_USER || 'admin';
const PASSWORD = process.env.LOGVIEW_PASS || 'supersecret';

const LOG_MODE = process.env.LOG_MODE || 'mac'; // "mac" or "linux"
const SYSTEMD_SERVICE = process.env.SERVICE_NAME || 'monitor-uploads.service';
const MAC_LOG_PATH = process.env.MAC_LOG_PATH || '/var/log/system.log';
const TAIL_LINES = process.env.TAIL_LINES || 50;

// --- BASIC AUTH ---
app.use(basicAuth({
  users: { [USERNAME]: PASSWORD },
  challenge: true,
  realm: 'LogViewer'
}));

// --- STATIC CSS ---
app.use('/static', express.static(path.join(__dirname, 'public')));

// --- UTILITY: Get Log Command ---
function getLogCommand() {
  if (LOG_MODE === 'linux') {
    return `journalctl -u ${SYSTEMD_SERVICE} --no-pager -n ${TAIL_LINES}`;
  } else {
    return `tail -n ${TAIL_LINES} ${MAC_LOG_PATH}`;
  }
}

// --- MAIN ROUTE ---
app.get('/', (req, res) => {
  exec(getLogCommand(), (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`<pre class="log-output error">❌ Error fetching logs:\n${stderr}</pre>`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Log Viewer</title>
        <meta http-equiv="refresh" content="5">
        <link rel="stylesheet" href="/static/style.css">
        <script>
          window.onload = function () {
            if (localStorage.getItem('theme') === 'dark') {
              document.body.classList.add('dark-mode');
            }
          };
        </script>
      </head>
      <body>
        <div class="container">
          <div class="button-row">
            <form method="GET" action="/download">
              <button type="submit">⬇️ Download Logs</button>
            </form>
            <button onclick="toggleDarkMode()">🌓 Toggle Dark Mode</button>
          </div>
          <h1>📋 Log Viewer (${LOG_MODE})</h1>
          <pre class="log-output">${stdout.trim()}</pre>
        </div>
        <script>
          function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
          }
        </script>
      </body>
      </html>
    `);
  });
});

// --- DOWNLOAD ENDPOINT ---
app.get('/download', (req, res) => {
  exec(getLogCommand(), (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send('Error fetching logs');
    }
    res.setHeader('Content-disposition', 'attachment; filename=logs.txt');
    res.setHeader('Content-Type', 'text/plain');
    res.send(stdout);
  });
});

app.listen(PORT, () => {
  console.log(`🔧 Log viewer running at http://localhost:${PORT} (${LOG_MODE} mode)`);
});
