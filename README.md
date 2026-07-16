# 鹿角蕨穿搭模擬器

靜態網站：選植株 → 挑板材 → 點綴配件 → LINE 預購。

## 本機預覽

```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```

瀏覽器開啟 http://localhost:8080

## 同步真實商品圖

商品圖來源：`桌面\喚鹿工作室商品圖片`（依子資料夾系列分類）

```powershell
powershell -ExecutionPolicy Bypass -File sync-catalog.ps1
```

會自動複製圖片到 `assets/plants/` 並更新 `catalog.json`。

系列分類對應：`何其美系列`、`侏儒系列`、`十八原生種系列`、`深綠系列`、`爪哇系列`、`皇冠系列`、`銀鹿系列`

## 部署（Netlify）

1. 將此資料夾推送到 GitHub
2. 在 [Netlify](https://netlify.com) 連結 repo
3. Build command 留空，Publish directory 設為 `.`

## LINE 分享

部署後將網址貼到 LINE 即可；官方帳號：@313lykia

## 同步上板材料圖

上板材料來源：`桌面\喚鹿工作室上板材料`

```powershell
powershell -ExecutionPolicy Bypass -File sync-bases.ps1
```

會依檔名字母順序取前 3 張圖，對應：
- `base_acrylic`
- `base_wood_3d`
- `base_metal_grid`

## 同步上板配件圖（Step 3）

配件來源：`桌面\上板配件`

```powershell
powershell -ExecutionPolicy Bypass -File sync-parts.ps1
```

規則：
- 支援：jpg / jpeg / png / webp
- 會遞迴讀取子資料夾
- 同步後會寫入 `catalog.json` 的 `parts`，前端 Step 3 自動改為圖片配件


## 配件價格對照表

修改 parts-price-map.json 來設定關鍵字價格，sync-parts.ps1 會依檔名關鍵字自動帶入價格。

