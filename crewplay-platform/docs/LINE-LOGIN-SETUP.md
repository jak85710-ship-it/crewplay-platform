# LINE Login 設定（www.crewplay.tw）

官方帳號 Basic ID：**@313lykia**

## 一、LINE Developers 後台

1. 開啟 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇與 **@313lykia** 同一 Provider
3. 建立或開啟 **LINE Login** 頻道（不是 Messaging API 那個，需有 Login 功能）
4. 進入 **LINE Login** 分頁 → **Callback URL** 新增：

   ```
   https://www.crewplay.tw/api/auth/line/callback
   ```

5. 本機測試可再加：

   ```
   http://localhost:3000/api/auth/line/callback
   ```

6. 記下 **Channel ID**（數字，例如 `165xxxxxxxx`）與 **Channel secret**

## 二、Netlify 環境變數

Project configuration → Environment variables → 新增：

| Key | Value |
|-----|--------|
| `LINE_CHANNEL_ID` | 你的 Channel ID |
| `LINE_CHANNEL_SECRET` | Channel secret（勾 Secret） |
| `NEXT_PUBLIC_SITE_URL` | `https://www.crewplay.tw` |

## 三、重新部署

Deploys → **Deploy project without cache**

## 四、測試

1. 開啟 https://www.crewplay.tw/login
2. 點 **LINE 登入**
3. 應跳轉 LINE 授權頁，同意後回到「我的預約」

## 常見錯誤

| 現象 | 原因 |
|------|------|
| `LINE 登入尚未設定` | Netlify 未填 `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` |
| 授權後失敗 | Callback URL 與後台不一致，或 Secret 錯誤 |
| 400 redirect_uri mismatch | `NEXT_PUBLIC_SITE_URL` 不是 `https://www.crewplay.tw` |

## LIFF（選填，Rich Menu 用）

1. 同一 Console → **LIFF** → Add → Endpoint URL：

   ```
   https://www.crewplay.tw/liff/bootstrap
   ```

2. Netlify：`NEXT_PUBLIC_LINE_LIFF_ID=你的LIFF_ID`

詳見 `docs/LINE-DUAL-SETUP.md`
