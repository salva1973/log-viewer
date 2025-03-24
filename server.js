// server.js

require('dotenv').config()
const express = require('express')
const basicAuth = require('express-basic-auth')
const { exec } = require('child_process')
const https = require('https')
const fs = require('fs')
const path = require('path')

const app = express()

const resolvePath = (p) => path.join(__dirname, p)

app.use('/static', express.static(resolvePath('public')))

require('dotenv').config({ path: resolvePath('.env') })

// SSL configuration
const sslOptions = {
  key: fs.readFileSync(resolvePath('cert/key.pem')),
  cert: fs.readFileSync(resolvePath('cert/cert.pem')),
  secureOptions:
    require('constants').SSL_OP_NO_TLSv1 |
    require('constants').SSL_OP_NO_TLSv1_1,
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
  ].join(':'),
}

const PORT = process.env.PORT || 8686
const USERNAME = process.env.LOGVIEW_USER || 'admin'
const PASSWORD = process.env.LOGVIEW_PASS || 'supersecret'
const LOG_MODE = process.env.LOG_MODE || 'mac'
const SYSTEMD_SERVICE = process.env.SERVICE_NAME || 'monitor-uploads.service'
const MAC_LOG_PATH = process.env.MAC_LOG_PATH || '/var/log/system.log'
const TAIL_LINES = process.env.TAIL_LINES || 50
const THEME = process.env.THEME || 'dark'

// --- BASIC AUTH ---
app.use(
  basicAuth({
    users: { [USERNAME]: PASSWORD },
    challenge: true,
    realm: 'LogViewer',
  })
)

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

const getLogCommand = () =>
  LOG_MODE === 'linux'
    ? `journalctl -u ${SYSTEMD_SERVICE} --no-pager -n ${TAIL_LINES}`
    : `tail -n ${TAIL_LINES} ${MAC_LOG_PATH}`

app.get('/', (req, res) => {
  exec(getLogCommand(), (error, stdout, stderr) => {
    if (error) {
      return res
        .status(500)
        .send(
          `<pre class="log-output error">❌ Error fetching logs:\n${stderr}</pre>`
        )
    }

    res.setHeader('Content-Type', 'text/html')
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Log Viewer</title>
        <link rel="stylesheet" href="/static/style.css">
        <script>
          window.onload = function () {
            const defaultTheme = '${THEME}';
            const savedTheme = localStorage.getItem('theme');
            if (!savedTheme) {
              localStorage.setItem('theme', defaultTheme);
            }
            if (localStorage.getItem('theme') === 'dark') {
              document.body.classList.add('dark-mode');
            }
          };
        </script>
      </head>
      <body>
        <div class="container">
          <h1>Monitor Uploads Log Viewer</h1>
          <p class="log-info">Showing last <strong>${TAIL_LINES}</strong> entries.</p>
          <pre class="log-output">${stdout.trim()}</pre>
          <div class="footer-buttons">
            <form method="GET" action="/" style="display:inline-block;">
              <button type="submit">Refresh Logs</button>
            </form>
            <form method="GET" action="/download" style="display:inline-block;">
              <button type="submit">Download Logs</button>
            </form>
          </div>
        </div>
      </body>
      </html>
    `)
  })
})

app.get('/download', (req, res) => {
  exec(getLogCommand(), (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send('Error fetching logs')
    }
    res.setHeader('Content-disposition', 'attachment; filename=logs.txt')
    res.setHeader('Content-Type', 'text/plain')
    res.send(stdout)
  })
})

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(
    `📋 Log viewer running securely at https://localhost:${PORT} (${LOG_MODE} mode)`
  )
})
