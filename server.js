// server.js

require('dotenv').config()
const express = require('express')
const basicAuth = require('express-basic-auth')
const { exec } = require('child_process')
const https = require('https')
const fs = require('fs')
const fse = require('fs-extra')
const os = require('os')
const path = require('path')

const app = express()

function resolvePath(p) {
  return path.join(__dirname, p)
}

// --- STATIC CSS ---
if (process.pkg) {
  const tmp = path.join(os.tmpdir(), 'logviewer-static')
  fse.ensureDirSync(tmp)
  const embeddedPublicPath = path.join(
    process.pkg ? path.dirname(process.execPath) : __dirname,
    'public'
  )
  fse.copySync(embeddedPublicPath, tmp)
  app.use('/static', express.static(tmp))
} else {
  app.use('/static', express.static(resolvePath('public')))
}

require('dotenv').config({ path: resolvePath('.env') })

// Load SSL certs
// const keyPath = path.join(__dirname, 'cert', 'key.pem')
// const certPath = path.join(__dirname, 'cert', 'cert.pem')
const embeddedCertPath = path.join(
  process.pkg ? path.dirname(process.execPath) : __dirname,
  'cert'
)

const tmpCertPath = path.join(os.tmpdir(), 'logviewer-cert')
fse.ensureDirSync(tmpCertPath)
fse.copySync(embeddedCertPath, tmpCertPath)

const keyPath = path.join(tmpCertPath, 'key.pem')
const certPath = path.join(tmpCertPath, 'cert.pem')

// SSL configuration
const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
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

const LOG_MODE = process.env.LOG_MODE || 'mac' // "mac" or "linux"
const SYSTEMD_SERVICE = process.env.SERVICE_NAME || 'logviewer.service'
const MAC_LOG_PATH = process.env.MAC_LOG_PATH || '/var/log/system.log'
const TAIL_LINES = process.env.TAIL_LINES || 50
const THEME = process.env.THEME || 'dark' // "dark" or "light"

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

// --- UTILITY: Get Log Command ---
function getLogCommand() {
  if (LOG_MODE === 'linux') {
    return `journalctl -u ${SYSTEMD_SERVICE} --no-pager -n ${TAIL_LINES}`
  } else {
    return `tail -n ${TAIL_LINES} ${MAC_LOG_PATH}`
  }
}

// --- MAIN ROUTE ---
app.get('/', (req, res) => {
  exec(getLogCommand(), (error, stdout, stderr) => {
    if (error) {
      return res
        .status(500)
        .send(
          `<pre class="log-output error">❌ Error fetching logs:\n${stderr}</pre>`
        )
    }

    const isDark = THEME === 'dark'
    const darkClass = isDark ? 'dark-mode' : ''

    res.setHeader('Content-Type', 'text/html')
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
          <pre class="log-output">${stdout.trim()}</pre>
        </div>
        <div class="footer-buttons">
          <form method="GET" action="/download">
            <button type="submit">Download Logs</button>
          </form>
        </div>
      </body>
      </html>
    `)
  })
})

// --- DOWNLOAD ENDPOINT ---
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
