#!/bin/bash
# Upload files to your server
scp -r * user@your-server-ip:/var/www/ip-capture/

# SSH into server and run
ssh user@your-server-ip << 'EOF'
cd /var/www/ip-capture
npm install
pm2 start server.js --name ip-capture
EOF