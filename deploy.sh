#!/bin/bash
set -e
# Load NVM
export NVM_DIR="/home/ubuntu/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" || export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"

cd /home/ubuntu/Protfolio
git fetch --all
git reset --hard origin/main
npm install
npm run build
pm2 restart all
echo "Deployed!"
