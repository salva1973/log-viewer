// logviewer.js (macOS edition)

require('dotenv').config()
const express = require('express')
const basicAuth = require('express-basic-auth')
const { exec } = require('child_process')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 8080
const USERNAME = process.env.LOGVIEW_USER || 'admin'
const PASSWORD = process.env.LOGVIEW_PASS || 'changeme'
const LOGFILE = process.env.LOGFILE || '/var/log/system.log'

// --- BASIC AUTH ---
app.use(
  basicAuth({
    users: { [USERNAME]: PASSWORD },
    challenge: true,
    realm: 'LogViewer',
  })
)

// --- STATIC CSS ---
app.use('/static', express.static(path.join(__dirname, 'public')))

// --- LOG VIEWER PAGE ---
app.get('/', (req, res) => {
  const lines = parseInt(req.query.lines) || 100
  const filter = req.query.filter || ''
  const page = parseInt(req.query.page) || 1
  const autoRefresh = req.query.auto === 'true'
  const offset = (page - 1) * lines

  const tailCommand = `tail -n ${offset + lines} ${LOGFILE}${
    filter ? ` | grep "${filter}"` : ''
  }`

  exec(tailCommand, (error, stdout, stderr) => {
    if (error) {
      return res
        .status(500)
        .send(
          `<pre class="log-output error">Error fetching logs:\n${stderr}</pre>`
        )
    }

    const logLines = stdout.trim().split('\n')
    const paginatedLines = logLines.slice(-lines).join('\n')
    const nextPage = page + 1
    const prevPage = Math.max(1, page - 1)

    res.setHeader('Content-Type', 'text/html')
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>macOS Log Viewer</title>
        <link rel="stylesheet" href="/static/style.css">
        ${autoRefresh ? '<meta http-equiv="refresh" content="10">' : ''}
      </head>
      <body>
        <div class="container">
          <h1>📄 macOS Log Viewer (${path.basename(LOGFILE)})</h1>
          <form method="GET" action="/">
            <label>Lines:
              <input type="number" name="lines" value="${lines}" min="10" max="1000">
            </label>
            <label>Filter:
              <input type="text" name="filter" value="${filter}" placeholder="Optional keyword">
            </label>
            <label>
              <input type="checkbox" name="auto" value="true" ${
                autoRefresh ? 'checked' : ''
              }> Auto-refresh
            </label>
            <input type="hidden" name="page" value="1">
            <button type="submit">Refresh</button>
          </form>
          <div class="pagination">
            <a href="/?lines=${lines}&filter=${filter}&page=${prevPage}&auto=${autoRefresh}">&laquo; Prev</a>
            <span>Page ${page}</span>
            <a href="/?lines=${lines}&filter=${filter}&page=${nextPage}&auto=${autoRefresh}">Next &raquo;</a>
          </div>
          <form method="GET" action="/download">
            <input type="hidden" name="lines" value="${lines}">
            <input type="hidden" name="filter" value="${filter}">
            <button type="submit">Download Logs</button>
          </form>
          <pre class="log-output">${paginatedLines}</pre>
        </div>
      </body>
      </html>
    `)
  })
})

// --- DOWNLOAD LOGS ---
app.get('/download', (req, res) => {
  const lines = parseInt(req.query.lines) || 100
  const filter = req.query.filter || ''
  const cmd = `tail -n ${lines} ${LOGFILE}${
    filter ? ` | grep "${filter}"` : ''
  }`

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send('Error generating log download.')
    }

    res.setHeader('Content-Disposition', 'attachment; filename=logs.txt')
    res.setHeader('Content-Type', 'text/plain')
    res.send(stdout)
  })
})

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Log viewer running on http://localhost:${PORT}`)
})
