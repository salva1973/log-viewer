const express = require('express')
const app = express()
const { exec } = require('child_process')

const PORT = process.env.PORT || 3000
const LOG_FILE = '/var/log/system.log' // Change this if you want to read another file

// Endpoint to retrieve logs from a file
app.get('/logs', (req, res) => {
  exec(`tail -n 30 ${LOG_FILE}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error: ${stderr}`)
    }
    res.setHeader('Content-Type', 'text/plain')
    res.send(stdout)
  })
})

// Root route with simple HTML log viewer
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>macOS Log Viewer</title>
        <style>
          body { font-family: monospace; background: #111; color: #eee; padding: 2rem; }
          pre { background: #222; padding: 1rem; border: 1px solid #444; height: 80vh; overflow-y: scroll; }
        </style>
      </head>
      <body>
        <h1>📄 macOS System Log Viewer</h1>
        <pre id="logs">Loading logs...</pre>
        <script>
          async function fetchLogs() {
            const res = await fetch('/logs');
            const data = await res.text();
            document.getElementById('logs').textContent = data;
          }
          fetchLogs();
          setInterval(fetchLogs, 5000); // refresh every 5 seconds
        </script>
      </body>
    </html>
  `)
})

app.listen(PORT, () => {
  console.log(`Log viewer app running at http://localhost:${PORT}`)
})
