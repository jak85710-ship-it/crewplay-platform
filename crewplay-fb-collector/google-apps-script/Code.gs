/**
 * CrewPlay 球館名單 — 自動寫入 API
 * 綁定試算表：1wBIDO4zPqB-4z4C1yPy-8CgOH-MInB36j7Tw46BR9VE
 *
 * 部署方式：部署 → 新增部署作業 → 網頁應用程式
 *   執行身分：我
 *   存取權：任何人
 */

const SHEET_ID = '1wBIDO4zPqB-4z4C1yPy-8CgOH-MInB36j7Tw46BR9VE';

// 欄位順序：sport, arena_name, introduce, photo, assign_url, region, location
const COLUMNS = ['sport', 'arena_name', 'introduce', 'photo', 'assign_url', 'region', 'location'];

function getTargetSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheets()[0];
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, message: 'CrewPlay Sheet API 運作中' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const rows = body.rows || [];
    if (!rows.length) {
      return json_({ ok: false, error: '沒有收到資料' });
    }

    const sheet = getTargetSheet_();
    const existingUrls = loadExistingUrls_(sheet);
    let added = 0;
    let skipped = 0;

    rows.forEach(function (row) {
      const url = String(row.assign_url || '').trim();
      if (url && existingUrls.has(url)) {
        skipped++;
        return;
      }
      sheet.appendRow(COLUMNS.map(function (col) {
        return row[col] != null ? String(row[col]) : '';
      }));
      if (url) existingUrls.add(url);
      added++;
    });

    return json_({ ok: true, added: added, skipped: skipped });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function loadExistingUrls_(sheet) {
  const urls = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return urls;

  // assign_url 在第 5 欄 (E)
  const numRows = lastRow - 1;
  if (numRows < 1) return urls;

  const values = sheet.getRange(2, 5, numRows, 1).getValues();
  values.forEach(function (row) {
    const url = String(row[0] || '').trim();
    if (url) urls.add(url);
  });
  return urls;
}
