# 資料夾 → 自動寫入試算表（不需試算表擁有權）

適合：**你有試算表編輯權限，但不是擁有者，無法開 Apps Script**。

流程：

```
FB 抓取 → ⑤ 存批次檔 → 丟進 inbox 資料夾 → 執行 sync-to-sheet.py → 自動寫入試算表
```

---

## 資料夾說明

| 資料夾 | 用途 |
|---|---|
| `inbox/` | 放從 FB 抓下來的 `.json` 批次檔（待處理）|
| `done/` | 已寫入試算表的檔案會自動移到這裡 |

---

## 一次性設定（約 10 分鐘）

### 1. 安裝 Python 套件

在 `crewplay-fb-collector` 資料夾開啟終端機，執行：

```powershell
pip install -r requirements.txt
```

### 2. 建立 Google Cloud OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案（名稱例如 `crewplay-sync`）
3. 左側 **API 和服務 → 程式庫** → 搜尋 **Google Sheets API** → **啟用**
4. **API 和服務 → OAuth 同意畫面** → 類型選 **外部** → 填專案名稱 → 測試使用者加你自己的 Gmail
5. **API 和服務 → 憑證 → 建立憑證 → OAuth 用戶端 ID**
   - 類型：**電腦版應用程式**
   - 名稱：`crewplay-sync`
6. 下載 JSON，重新命名為 **`credentials.json`**，放到 `crewplay-fb-collector/` 資料夾

### 3. 第一次授權

```powershell
python sync-to-sheet.py
```

- 瀏覽器會跳出 Google 登入 → 選**有試算表編輯權限的那個帳號**
- 允許存取 → 完成後會產生 `token.json`（之後不用再登入）

---

## 每天使用

### FB 端

1. ① 展開 → ② 抓取
2. 按 **⑤ 存批次檔到 inbox**
3. 瀏覽器會下載 `crewplay-batch-時間.json`
4. 把檔案**移動到** `crewplay-fb-collector/inbox/` 資料夾

### 電腦端

```powershell
python sync-to-sheet.py
```

成功後檔案會從 `inbox/` 移到 `done/`，資料出現在試算表最下方。

---

## 進階：全自動（選用）

用 Windows「工作排程器」每 5 分鐘執行一次：

- 程式：`python`
- 引數：`C:\完整路徑\crewplay-fb-collector\sync-to-sheet.py`
- 起始於：`C:\完整路徑\crewplay-fb-collector`

之後你只要把 JSON 丟進 `inbox/`，就會自動進試算表。

---

## 常見問題

**Q：一定要 Google Cloud 嗎？**  
A：自動寫入試算表需要 Google 官方 API 授權。你不需要試算表擁有權，只要用**有編輯權限的 Google 帳號**登入一次即可。

**Q：同一篇貼文會重複嗎？**  
A：不會。腳本會依 `assign_url` 自動跳過已存在的貼文。

**Q：還能用方式 A 手動貼上嗎？**  
A：可以，③ 複製貼上依然可用，兩種方式可並存。
