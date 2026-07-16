#!/bin/bash
# CrewPlay sms-proxy — run on VPS (AlmaLinux 8) as root
set -euo pipefail

DOMAIN="${SMS_DOMAIN:-sms.crewplay.tw}"
EMAIL="${CERTBOT_EMAIL:-crew.matchplay@gmail.com}"
APP_DIR="/opt/crewplay-sms-proxy"

echo "==> Installing packages..."
dnf install -y curl nginx certbot python3-certbot-nginx firewalld 2>/dev/null || true

echo "==> Node.js 20 (NodeSource)..."
if ! node -e "process.exit(typeof fetch==='function'?0:1)" >/dev/null 2>&1; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf remove -y nodejs npm 2>/dev/null || true
  dnf install -y nodejs --allowerasing
fi
node -v

echo "==> Firewall (80/443)..."
systemctl enable --now firewalld 2>/dev/null || true
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

echo "==> systemd service..."
cp "$APP_DIR/deploy/crewplay-sms-proxy.service" /etc/systemd/system/
sed -i 's/\r$//' /etc/systemd/system/crewplay-sms-proxy.service
chmod 600 "$APP_DIR/.env"
systemctl daemon-reload
systemctl enable --now crewplay-sms-proxy

echo "==> Health check (local)..."
sleep 2
curl -sf "http://127.0.0.1:8787/health" || { systemctl status crewplay-sms-proxy --no-pager; exit 1; }

echo "==> Nginx reverse proxy..."
cp "$APP_DIR/deploy/nginx-sms.conf.example" /etc/nginx/conf.d/crewplay-sms.conf
sed -i "s/sms.crewplay.tw/${DOMAIN}/g" /etc/nginx/conf.d/crewplay-sms.conf
nginx -t
systemctl enable --now nginx

echo "==> TLS certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || {
  echo "Certbot failed — check DNS for $DOMAIN points to this server, then run:"
  echo "  certbot --nginx -d $DOMAIN"
  exit 1
}

echo "==> Final checks..."
curl -sf "https://${DOMAIN}/health"
echo ""
echo "OK: https://${DOMAIN}/health"
echo "Proxy URL: https://${DOMAIN}/api/sms/login-otp"
