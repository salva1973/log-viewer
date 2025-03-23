const express = require('express')
const app = express()
const { exec } = require('child_process')

const PORT = process.env.PORT || 3000

// Endpoint to retrieve logs from your specific systemd service
// app.get('/logs', (req, res) => {
//   exec(
//     'journalctl -u monitor-uploads.service --no-pager -n 50',
//     (error, stdout, stderr) => {
//       if (error) {
//         return res.status(500).send(stderr)
//       }
//       res.setHeader('Content-Type', 'text/plain')
//       res.send(stdout)
//     }
//   )
// })

// Configure /etc/systemd/journald.conf for limits.
// SystemMaxUse=200M
// SystemMaxFileSize=50M
// RuntimeMaxUse=50M
// sudo systemctl restart systemd-journald

app.get('/logs', (req, res) => {
  exec(
    'journalctl -u monitor-uploads.service --no-pager --since "2 hours ago" -n 50',
    (error, stdout, stderr) => {
      if (error) return res.status(500).send('Internal Server Error')
      res.setHeader('Content-Type', 'text/plain')
      res.send(stdout)
    }
  )
})

// Root route with basic HTML
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Monitor Logs</title></head>
      <body>
        <h1>Monitor Upload Logs</h1>
        <pre id="logs">Loading logs...</pre>
        <script>
          async function fetchLogs() {
            const res = await fetch('/logs');
            const data = await res.text();
            document.getElementById('logs').textContent = data;
          }
          fetchLogs();
          setInterval(fetchLogs, 5000); // refresh every 5 sec
        </script>
      </body>
    </html>
  `)
})

app.listen(PORT, () => {
  console.log(`Log viewer app listening at http://localhost:${PORT}`)
})
