# CrewPlay 自動寫入試算表 — 一步一步設定教學

> 不需試算表擁有權、不需 Python、不需 Apps Script。  
> 只要你有試算表**編輯權限**（能貼上資料）就可以。

總共 **4 大步驟**，每步完成後跟我說，我再帶你下一步。

---

## 【步驟 1】更新 FB 抓取器到 v1.3

1. 打開 Tampermonkey → 編輯 **CrewPlay 揪團抓取器**
2. 全選刪掉舊內容
3. 貼上 `crewplay-fb-collector.user.js` 最新內容
4. **Ctrl+S** 儲存
5. 確認版本顯示 **1.3.0**，面板有 **⑤ 存批次檔** 按鈕

✅ 完成標準：FB 社團頁右下角面板出現紫色 **⑤ 存批次檔** 按鈕

---

## 【步驟 2】建立 Google Cloud 憑證（約 10 分鐘）

### 2-1 建立專案
1. 打開 https://console.cloud.google.com/
2. 左上角專案下拉 → **新增專案**
3. 名稱填 `crewplay-sync` → **建立**

### 2-2 啟用 Google Sheets API
1. 左側 **API 和服務 → 程式庫**
2. 搜尋 **Google Sheets API**
3. 點進去 → **啟用**

### 2-3 設定 OAuth 同意畫面
1. **API 和服務 → OAuth 同意畫面**
2. 類型選 **外部** → **建立**
3. 應用程式名稱填 `CrewPlay Sync`
4. 使用者支援電子郵件：選你的 Gmail
5. **儲存並繼續**（範圍、測試使用者可先跳過）
6. **測試使用者** → **新增使用者** → 輸入**有試算表編輯權限的 Gmail** → 儲存

### 2-4 建立 OAuth 用戶端
1. **API 和服務 → 憑證**
2. **建立憑證 → OAuth 用戶端 ID**
3. 類型選 **電腦版應用程式**
4. 名稱填 `crewplay-desktop`
5. **建立**
6. 記下 **用戶端 ID** 和 **用戶端密鑰**（稍後要貼進 config.json）

✅ 完成標準：你手上有 Client ID 和 Client Secret 兩串文字

---

## 【步驟 3】取得 Refresh Token（OAuth Playground）

1. 打開 https://developers.google.com/oauthplayground/
2. 右上角 **齒輪 ⚙** → 勾選 **Use your own OAuth credentials**
3. 貼上你的 **OAuth Client ID** 和 **OAuth Client secret** → **Close**
4. 左側找到 **Google Sheets API v4** → 勾選  
   `https://www.googleapis.com/auth/spreadsheets`
5. 按 **Authorize APIs** → 登入**有試算表編輯權限的 Google 帳號** → 允許
6. 按 **Exchange authorization code for tokens**
7. 複製右側的 **Refresh token**（很長一串）

### 3-1 建立 config.json

1. 複製 `config.example.json` → 重新命名為 **`config.json`**
2. 填入：

```json
{
  "client_id": "你的 Client ID",
  "client_secret": "你的 Client Secret",
  "refresh_token": "你的 Refresh Token",
  "sheet_id": "1wBIDO4zPqB-4z4C1yPy-8CgOH-MInB36j7Tw46BR9VE"
}
```

3. 存檔到 `crewplay-fb-collector/` 資料夾

✅ 完成標準：`config.json` 四個欄位都已填好

---

## 【步驟 4】實際跑一次

### 4-1 FB 抓取
1. 打開 FB 揪團社團
2. ① 展開 → ② 抓取
3. 按 **⑤ 存批次檔**
4. 瀏覽器會下載 `crewplay-batch-xxxxx.json`
5. 把檔案**移動到**：
   ```
   crewplay-fb-collector/inbox/
   ```

### 4-2 執行同步
1. 在 `crewplay-fb-collector` 資料夾，**右鍵 `sync-to-sheet.ps1`**
2. 選 **使用 PowerShell 執行**
   - 若被擋：先開 PowerShell，執行：
     ```powershell
     Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
     ```
     再重新執行腳本
3. 看到「寫入 N 筆」= 成功
4. 到試算表最下方確認資料
5. JSON 檔會自動移到 `done/` 資料夾

✅ 完成標準：試算表出現新資料列

---

## 之後每天怎麼用

```
FB：① → ② → ⑤ 存批次檔 → 丟進 inbox/
電腦：雙擊 sync-to-sheet.ps1
```

---

## 常見錯誤

| 錯誤 | 解法 |
|---|---|
| 找不到 config.json | 確認檔名是 config.json（不是 example）|
| invalid_grant | Refresh Token 過期，重做步驟 3 |
| 403 Permission denied | 確認登入的 Google 帳號有試算表編輯權限 |
| 無法執行 ps1 | 執行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

---

**現在請從【步驟 1】開始。** 完成後回覆「步驟 1 完成」，我帶你做步驟 2。
