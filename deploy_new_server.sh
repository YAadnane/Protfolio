#!/bin/bash
# Script de déploiement pour le nouveau serveur
# IP: 158.179.211.5
# SSH Key: ssh-key-2026-02-10.key

set -e

# Configuration
NEW_SERVER_IP="158.179.211.5"
SSH_KEY="D:\Nouveau dossier (2)\MX\M2\S4 _PFE\portfolio\ssh-key-2026-02-10.key"
PROJECT_PATH="/mnt/ancien_disque/home/ubuntu/Protfolio"
USER="ubuntu"

echo "🚀 Déploiement sur le nouveau serveur..."
echo "IP: $NEW_SERVER_IP"
echo ""

# Connexion via SSH et déploiement
ssh -i "$SSH_KEY" ${USER}@${NEW_SERVER_IP} << 'ENDSSH'
    set -e
    cd /mnt/ancien_disque/home/ubuntu/Protfolio
    
    echo "📦 Git pull..."
    git pull origin main
    
    echo "📦 Installation des dépendances..."
    npm install
    
    echo "🔨 Build du projet..."
    npm run build
    
    echo "🔄 Redémarrage PM2..."
    pm2 restart portfolio-server || pm2 start server/index.js --name portfolio-server
    pm2 save
    
    echo "✅ Déploiement terminé!"
    echo ""
    echo "Status PM2:"
    pm2 list
ENDSSH

echo ""
echo "✨ Déploiement réussi sur $NEW_SERVER_IP!"
echo "🌐 Testez: http://$NEW_SERVER_IP:3000"
