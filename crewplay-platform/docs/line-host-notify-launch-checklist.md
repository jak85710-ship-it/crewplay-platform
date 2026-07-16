# LINE 團主新預約推播上線清單

本清單用於上線「團主收到新預約 + 團主進場核銷連結」的 LINE 推播。

## 1) 先確認現有功能

目前程式已具備：

- 新預約建立後觸發 LINE 推播（`notifyBookingCreatedLine`）
- 團主推播內容包含：
  - 揪團名稱
  - 報名編號
  - 報名者姓名/手機/Email
  - 時間、地點
  - 團主掃碼入口（`/checkin/host?t=...`）
- 團主掃碼入口使用簽章 token（預設 30 天）

## 2) 必填環境變數

在 Netlify（或部署平台）設定：

- `LINE_NOTIFY_ENABLED=true`
- `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=<LINE Messaging API token>`

團主收件者至少要設定一種：

- 全域收件者：`LINE_NOTIFY_HOST_UIDS=Uxxxx,Uyyyy`
- 依團分配：`LINE_NOTIFY_HOST_UIDS_BY_TEAM={"team-id-1":["Uxxxx"],"team-id-2":"Uyyyy"}`

## 3) 上線前驗證（Staging）

1. 先把 `LINE_NOTIFY_ENABLED=true`，但只放測試團主 UID。
2. 用測試帳號完成一筆預約。
3. 確認團主收到推播內容是否含：
   - 報名編號（例：`4C11B235`）
   - 報名者資訊
   - 時間/地點
   - 團主核銷入口
4. 在手機點核銷入口，確認可進入掃碼頁且可核銷成功。

## 4) 正式上線驗收

每個重點團隊至少驗收 1 次：

- 有收到推播
- 連結可打開
- 核銷流程可完成
- 球友端「我的預約」QR 可被掃描

## 5) 失敗排查順序

1. `LINE_NOTIFY_ENABLED` 是否為 `true`
2. `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` 是否有效
3. 該團是否有對應 UID（`LINE_NOTIFY_HOST_UIDS_BY_TEAM`）
4. 該 UID 是否為可推播目標（已加好友/可接收）
5. 伺服器 log 是否出現 `line_push_failed:*`

## 6) 回滾方案

若發生大量錯發/格式錯誤：

1. 立即設 `LINE_NOTIFY_ENABLED=false`
2. 保留 Email 通知流程（不受影響）
3. 修正後先用單一測試 UID 灰度恢復

## 7) 建議第二階段（優化）

- 把團主 LINE UID 改為「後台可維護」，降低改 env 成本
- 新增推播成功/失敗紀錄頁
- 為新預約事件加 idempotency（避免重複推播）
- 支援 Flex Message（更易讀）

