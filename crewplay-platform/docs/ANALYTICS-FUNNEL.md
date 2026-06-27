# 網站漏斗分析（使用者在哪一步離開）

## 本機資料夾看數據（不需 GA4）

1. Netlify 設定 `ADMIN_API_KEY`（長隨機字串），重新部署
2. 本機 `crewplay-platform/.env.local` 寫同一組金鑰：
   ```
   ADMIN_API_KEY=你的金鑰
   ```
3. 等訪客使用網站一段時間後，雙擊 **`匯出流量數據.bat`**
4. 自動開啟 `data-export/流量儀表板.html` — 可看漏斗、流失、每日流量

也可執行 `匯出後台數據.bat` 匯出揪團/預約 CSV。

---

## 目前狀況

網站已埋入 **Google Analytics 4（GA4）漏斗事件**，可追蹤使用者從進站到離開的每一步。

| 步驟 | 事件 | 對應頁面 |
|------|------|----------|
| 1 | `home` | 首頁 `/` |
| 2 | `teams_list` | 揪團列表 `/teams` |
| 3 | `team_detail` | 團詳情 `/teams/[id]` |
| 4 | `book_form` | 預約表單 `/book/[id]` |
| 5 | `book_success` | 預約成功 `/book/result?status=ok` |
| 6 | `login` | 登入 `/login` |
| 7 | `my_bookings` | 我的預約 `/my/bookings` |
| 8 | `join_host` | 團主入駐 |
| 9 | `join_venue` | 場地入駐 |

額外行為事件（`crewplay_action`）：

- `line_login_click` — 點 LINE 登入
- `phone_otp_sent` — 手機驗證碼已發送
- `phone_login_success` — 手機登入成功
- `booking_submitted` — 預約表單送出

---

## 第一步：建立 GA4（免費，必做）

僅有 Google Ads 代碼 **無法** 看完整漏斗，需另建 GA4：

1. 開啟 [Google Analytics](https://analytics.google.com/)
2. 建立資源 → 網站 `www.crewplay.tw`
3. 取得 **Measurement ID**（格式 `G-XXXXXXXXXX`）
4. Netlify → Environment variables 新增：

   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-你的ID
   ```

5. 重新部署 Netlify

---

## 第二步：在 GA4 看「在哪一步流失」

部署後約 **24–48 小時** 開始有資料（即時報表可先看今天）。

### 方法 A：漏斗探索（推薦）

1. GA4 左側 → **探索** → **空白**
2. 技巧選 **漏斗探索**
3. 步驟依序加入事件 `crewplay_funnel`，篩選參數 `step_name`：
   - `home` → `teams_list` → `team_detail` → `book_form` → `book_success`
4. 即可看到每一步剩多少人、流失率

### 方法 B：即時總覽

**報表 → 即時** → 看目前有哪些人在哪個頁面。

### 方法 C：事件報表

**報表 → 參與度 → 事件** → 找 `crewplay_funnel`、`crewplay_action` 各次數。

---

## 典型解讀範例

| 現象 | 可能原因 |
|------|----------|
| 首頁多、列表少 | 首頁吸引力或 CTA 不足 |
| 詳情多、預約少 | 團費/時間/地點資訊不夠清楚 |
| 表單多、成功少 | 表單太長、Email 必填嚇跑人 |
| 登入多、我的預約少 | LINE/手機登入失敗（可對照 action 事件） |

---

## 隱私

請在 [隱私權政策](/privacy) 提及使用 Google Analytics 分析流量（若尚未更新可補充）。

---

## 本機測試

1. 設定 `.env.local`：`NEXT_PUBLIC_GA_MEASUREMENT_ID=G-xxx`
2. `npm run dev` 瀏覽各頁
3. GA4 → **即時** 確認是否收到 `crewplay_funnel` 事件
