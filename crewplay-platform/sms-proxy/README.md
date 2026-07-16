# CrewPlay 三竹 Mitake 簡訊 Proxy

Netlify 沒有固定 IP，三竹要求白名單 IP，因此 **Mitake 帳密只放在 VPS**，官網透過 proxy 發 OTP。

## 架構

```
www.crewplay.tw (Netlify)
  POST /api/auth/phone/send
    → MITAKE_PROXY_URL (VPS)
      → https://smsapi.mitake.com.tw/... (三竹，443)
```

三竹 API（官方）：

| 項目 | 值 |
|------|-----|
| 網域 | `smsapi.mitake.com.tw` |
| IP | `211.72.227.230`、`60.250.14.104` |
| Port | `443` (HTTPS) |

VPS **對外 IP** 需先向三竹申請白名單。

## 1. VPS 部署（AlmaLinux 8）

SSH 登入戰國策 VPS 後：

```bash
# 上傳整個 sms-proxy 資料夾，或在 repo 根目錄執行：
cd /opt
sudo mkdir -p crewplay-sms-proxy
# 將 server.mjs、deploy/ 複製到 /opt/crewplay-sms-proxy/

sudo cp deploy/crewplay-sms-proxy.service /etc/systemd/system/
sudo systemctl daemon-reload
```

建立 `/opt/crewplay-sms-proxy/.env`（**勿 commit**）：

```env
PORT=8787
SMS_PROXY_SECRET=請填與-Netlify-相同的長隨機字串
MITAKE_USERNAME=三竹帳號
MITAKE_PASSWORD=三竹密碼
SMS_BRAND_NAME=CrewPlay
MITAKE_API_URL=https://smsapi.mitake.com.tw/api/mtk/SmSend?CharsetURL=UTF-8
```

```bash
sudo systemctl enable --now crewplay-sms-proxy
curl -s http://127.0.0.1:8787/health
# 應回 {"ok":true,"mitake":true,"auth":true}
```

### HTTPS（建議）

GoDaddy DNS 新增 **A 記錄**：

- `sms.crewplay.tw` → VPS 公網 IP

```bash
sudo dnf install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx-sms.conf.example /etc/nginx/conf.d/crewplay-sms.conf
# 編輯 server_name、proxy_pass
sudo certbot --nginx -d sms.crewplay.tw
sudo systemctl reload nginx
```

正式 proxy 網址：

`https://sms.crewplay.tw/api/sms/login-otp`

## 2. Netlify 環境變數

Site settings → Environment variables：

| 變數 | 值 |
|------|-----|
| `SMS_PROVIDER` | `mitake` |
| `SMS_BRAND_NAME` | `CrewPlay` |
| `MITAKE_PROXY_URL` | `https://sms.crewplay.tw/api/sms/login-otp` |
| `SMS_PROXY_SECRET` | 與 VPS `.env` 相同 |
| `AUTH_DEV_OTP` | `false` |

**不要**在 Netlify 填 `MITAKE_USERNAME` / `MITAKE_PASSWORD`。

Deploy 後測試：官網 → 手機登入 → 應收到【CrewPlay】驗證碼簡訊。

## 3. 測試

VPS 上（需 Mitake 白名單為此 VPS IP）：

```bash
curl -s -X POST http://127.0.0.1:8787/api/sms/login-otp \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"phone":"09XXXXXXXX","code":"123456"}'
```

本機（已設定 `.env.local` 的 `MITAKE_PROXY_URL` + `SMS_PROXY_SECRET`）：

```bash
cd crewplay-platform
node scripts/test-mitake-proxy.mjs 09XXXXXXXX
```

直接測三竹（僅限 IP 已白名單的機器）：

```bash
node scripts/test-sms-direct.mjs 09XXXXXXXX
```

## 4. 常見錯誤

| 現象 | 原因 |
|------|------|
| `proxy_not_configured` | VPS `.env` 缺帳密 |
| `unauthorized` | `SMS_PROXY_SECRET` 與 Netlify 不一致 |
| 三竹回 `-1` / IP 相關 | VPS IP 未加入三竹白名單 |
| Netlify `sms_failed` | proxy URL 錯、防火牆未開 443、或 Mitake 餘額不足 |
