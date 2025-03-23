# log-viewer

/etc/systemd/system/logviewer.service

[Unit]
Description=Deployment Log Viewer Web Service
After=network.target

[Service]
ExecStart=/usr/local/bin/logviewer
Restart=always
User=root
Group=root

[Install]
WantedBy=multi-user.target

sudo systemctl daemon-reload
sudo systemctl enable --now logviewer.service
