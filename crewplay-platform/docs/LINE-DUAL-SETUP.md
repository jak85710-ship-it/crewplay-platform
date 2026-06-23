# LINE dual track setup

## 診斷結果（2026-06）

| 服務 | 網址 | 狀態 |
|------|------|------|
| 新站揪團 API | `https://www.crewplay.tw/api/teams` | 正常 |
| 新站 LIFF 入口 | `https://www.crewplay.tw/liff/bootstrap` | 正常 |
| **舊 LINE 後台** | `https://api.crewplay.tw/arena/sheet_sync` | **503 已掛** |

**「即時預約」按鈕無法用的主因：** 舊版是在 LINE 聊天室內開搜尋畫面，資料來自 `api.crewplay.tw`，該伺服器目前 **503**。  
網站已搬到 Netlify，但 **LINE 圖文選單網址尚未改到新站**。

本機檢查：`powershell -File crewplay-platform/scripts/check-line-status.ps1`

---

## Rich Menu（官方帳號後台 → 圖文選單）

請把按鈕改成 **開啟網址**（不要用舊的 Webnode / api 內嵌頁）：

| 按鈕 | 建議 URL |
|------|----------|
| 找揪團 | `https://www.crewplay.tw/teams` |
| **即時預約** | `https://www.crewplay.tw/teams` 或下方 LIFF |
| 我的預約 | `https://www.crewplay.tw/my/bookings` |

### 即時預約（LIFF 版，選填）

`https://liff.line.me/{LIFF_ID}?path=/teams`

## LIFF app

1. LINE Developers Console → create LIFF → **Endpoint URL:** `https://www.crewplay.tw/liff/bootstrap`
2. Netlify 環境變數：`NEXT_PUBLIC_LINE_LIFF_ID=你的LIFF_ID`
3. Size: Full

## LINE Login

1. Create LINE Login channel (same provider as OA)
2. Callback URL: `https://www.crewplay.tw/api/auth/line/callback`
3. Netlify：`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`

## 資料同步（取代舊 sheet_sync）

舊流程：`強制同步LINE.bat` → `api.crewplay.tw`（已掛）

新流程：

1. `crewplay-fb-collector\publish-to-api.ps1` → 更新 `teams.json`
2. Git push → Netlify 自動部署
3. 或 POST `https://www.crewplay.tw/api/arena/sheet_sync` 僅確認網站資料筆數（不會修復舊 LINE 內建搜尋）

## Backend alignment（給仍維護 api.crewplay.tw 的管理員）

若需恢復 LINE **聊天室內**搜尋，必須修復 `api.crewplay.tw` 或改接：

- `GET https://www.crewplay.tw/api/teams?sport=羽球`

---

## DNS

網站已部署於 **www.crewplay.tw**（Netlify）。
