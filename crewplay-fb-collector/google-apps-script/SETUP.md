# 串接你的 Google 試算表（一次性設定）

試算表：[Crewplay 球館名單](https://docs.google.com/spreadsheets/d/1wBIDO4zPqB-4z4C1yPy-8CgOH-MInB36j7Tw46BR9VE/edit)

設定完成後，FB 抓取器可按 **「④ 自動寫入 Google 試算表」**，不用再手動 Ctrl+V 貼上。

---

## 步驟 1：貼上 Apps Script

1. 打開你的試算表。
2. 上方選單 **擴充功能 → Apps Script**。
3. 把 `Code.gs` 的內容**整份貼上**（可刪掉預設的 `myFunction`）。
4. 按 **儲存**（磁碟圖示），專案名稱可改為 `CrewPlay 寫入 API`。

## 步驟 2：部署成網頁應用程式

1. 右上角 **部署 → 新增部署作業**。
2. 類型選 **網頁應用程式**。
3. 設定：
   - **說明**：CrewPlay FB 寫入
   - **執行身分**：**我**
   - **具有存取權的使用者**：**任何人**
4. 按 **部署**。
5. 第一次會要你 **授權**（選你的 Google 帳號 → 進階 → 前往 → 允許）。
6. 部署完成後，**複製「網頁應用程式 URL」**（長得像 `https://script.google.com/macros/s/xxxxx/exec`）。

## 步驟 3：把 URL 貼進 FB 抓取器

1. 到 Facebook 社團頁，打開 **CrewPlay 揪團抓取器** 面板。
2. 在 **「試算表 API 網址」** 輸入框貼上剛才複製的 URL。
3. 按 **儲存網址**。
4. 之後抓取完按 **④ 自動寫入 Google 試算表** 即可。

---

## 測試 API 是否正常

在瀏覽器新分頁打開你的部署 URL，應看到：

```json
{"ok":true,"message":"CrewPlay Sheet API 運作中"}
```

代表 API 已上線。

---

## 注意事項

- 同一篇貼文（相同 `assign_url`）**不會重複寫入**，會自動跳過。
- 若之後改試算表權限或重新部署，URL 可能會變，需重新貼到抓取器。
- `photo` 欄仍須你在試算表手動補圖片網址。
