#!/bin/bash
set -e

# Load NVM if possible, or manually add to PATH
export NVM_DIR="/home/ubuntu/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
else
    export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

cd /home/ubuntu/Protfolio

echo "Fetching latest..."
git fetch --all

echo "Resetting to c64e57180dfa5c378c844c07aad0eeaf7a55726f..."
git reset --hard c64e57180dfa5c378c844c07aad0eeaf7a55726f

echo "Building..."
npm install
npm run build

echo "Restarting PM2..."
pm2 restart all

echo "Deployment Complete!"
