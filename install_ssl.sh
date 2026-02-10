#!/bin/bash
# Script d'installation SSL automatique
# À exécuter APRÈS la mise à jour DNS

SSH_KEY="D:\Nouveau dossier (2)\MX\M2\S4 _PFE\portfolio\ssh-key-2026-02-10.key"
SERVER_IP="158.179.211.5"
DOMAIN="yadani-adnane.duckdns.org"
EMAIL="yadani.adnane20@gmail.com"

echo "🔍 Vérification DNS..."
DNS_IP=$(nslookup $DOMAIN | grep -A1 "Name:" | tail -1 | awk '{print $2}')

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    echo "❌ ERREUR: Le DNS ne pointe pas vers $SERVER_IP"
    echo "   DNS actuel: $DNS_IP"
    echo "   Mettez à jour DuckDNS d'abord!"
    exit 1
fi

echo "✅ DNS OK: $DOMAIN → $SERVER_IP"
echo ""
echo "🔐 Installation du certificat SSL..."

ssh -i "$SSH_KEY" ubuntu@$SERVER_IP << ENDSSH
    sudo certbot --nginx \
        -d $DOMAIN \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        --redirect
    
    echo ""
    echo "✅ Certificat SSL installé!"
    echo ""
    echo "📋 Vérification:"
    sudo certbot certificates
ENDSSH

echo ""
echo "🌐 Testez: https://$DOMAIN"
echo "🔒 Le site devrait être accessible en HTTPS!"
