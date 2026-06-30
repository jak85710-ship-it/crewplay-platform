/**
 * Export CrewPlay backend data for analytics (CSV + JSON summary).
 * Usage: node scripts/export-analytics.mjs
 * Output: crewplay-platform/data-export/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data-export");
const SITE = process.env.CREWPLAY_SITE_URL || "https://www.crewplay.tw";
const GCS = "https://storage.googleapis.com/crewplay-arena-storage/photo/";

function readJson(relPath, fallback = null) {
  const file = path.join(ROOT, relPath);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function escapeCsv(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCsv(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsv(typeof c.value === "function" ? c.value(row) : row[c.key])).join(",")
  );
  return [header, ...lines].join("\r\n");
}

function writeCsv(name, rows, columns) {
  fs.writeFileSync(path.join(OUT, name), `\uFEFF${toCsv(rows, columns)}`, "utf8");
}

function countBy(items, keyFn) {
  const map = {};
  for (const item of items) {
    const k = keyFn(item) || "(未填)";
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function hasUploadedPhoto(team) {
  const p = (team.photo || "").trim();
  return (
    p.endsWith(`/photo/r${team.sheet_row}.jpg`) ||
    p.endsWith(`/photo/r${team.sheet_row}.webp`) ||
    p === `${GCS}r${team.sheet_row}.jpg`
  );
}

function parseIntroField(intro, label) {
  const re = new RegExp(`${label}[：:]\\s*([^\\n]+)`);
  const m = (intro || "").match(re);
  return m ? m[1].trim() : "";
}

async function fetchLiveTeamCount() {
  try {
    const res = await fetch(`${SITE}/api/teams`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const data = await res.json();
    return { count: data.count ?? data.teams?.length ?? null, total: data.total ?? null };
  } catch {
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const teamsManifest = readJson("public/data/teams.json", { teams: [], exportedAt: null });
  const bookingsManifest = readJson("public/data/bookings.json", { bookings: [] });
  const hostRows = readJson("public/data/submissions/host.json", []);
  const venueRows = readJson("public/data/submissions/venue.json", []);
  const rowIdMap = readJson("public/data/row-id-map.json", {});

  const teams = teamsManifest.teams || [];
  const bookings = bookingsManifest.bookings || [];
  const exportedAt = new Date().toISOString();

  const teamRows = teams.map((t) => ({
    id: t.id,
    sheet_row: t.sheet_row,
    sport: t.sport,
    arena_name: t.arena_name,
    region: t.region,
    location: t.location,
    status: t.status,
    fee_amount: t.fee_amount,
    fee_label: t.fee_label,
    has_uploaded_photo: hasUploadedPhoto(t) ? "yes" : "no",
    photo: t.photo,
    assign_url: t.assign_url,
    intro_location: parseIntroField(t.introduce, "地點"),
    intro_time: parseIntroField(t.introduce, "時間"),
    intro_fee: parseIntroField(t.introduce, "費用"),
    intro_level: parseIntroField(t.introduce, "程度"),
    introduce: t.introduce,
  }));

  writeCsv("teams.csv", teamRows, [
    { header: "id", key: "id" },
    { header: "sheet_row", key: "sheet_row" },
    { header: "sport", key: "sport" },
    { header: "arena_name", key: "arena_name" },
    { header: "region", key: "region" },
    { header: "location", key: "location" },
    { header: "status", key: "status" },
    { header: "fee_amount", key: "fee_amount" },
    { header: "fee_label", key: "fee_label" },
    { header: "has_uploaded_photo", key: "has_uploaded_photo" },
    { header: "photo", key: "photo" },
    { header: "assign_url", key: "assign_url" },
    { header: "intro_location", key: "intro_location" },
    { header: "intro_time", key: "intro_time" },
    { header: "intro_fee", key: "intro_fee" },
    { header: "intro_level", key: "intro_level" },
    { header: "introduce", key: "introduce" },
  ]);

  writeCsv("bookings.csv", bookings, [
    { header: "id", key: "id" },
    { header: "team_id", key: "team_id" },
    { header: "guest_name", key: "guest_name" },
    { header: "guest_phone", key: "guest_phone" },
    { header: "guest_email", key: "guest_email" },
    { header: "slots", key: "slots" },
    { header: "amount", key: "amount" },
    { header: "status", key: "status" },
    { header: "payment_provider", key: "payment_provider" },
    { header: "merchant_trade_no", key: "merchant_trade_no" },
    { header: "line_uid", key: "line_uid" },
    { header: "note", key: "note" },
    { header: "created_at", key: "created_at" },
    { header: "paid_at", key: "paid_at" },
  ]);

  writeCsv("host_submissions.csv", hostRows, [
    { header: "id", key: "id" },
    { header: "submitted_at", key: "submitted_at" },
    { header: "sport", key: "sport" },
    { header: "location", key: "location" },
    { header: "weekday", key: "weekday" },
    { header: "time_slots", value: (r) => (Array.isArray(r.time_slots) ? r.time_slots.join(" | ") : r.time_slots) },
    { header: "fee", key: "fee" },
    { header: "skill_level", key: "skill_level" },
    { header: "team_name", key: "team_name" },
    { header: "phone", key: "phone" },
    { header: "email", key: "email" },
    { header: "trust_image_id", key: "trust_image_id" },
    { header: "merchant_trade_no", key: "merchant_trade_no" },
    { header: "payment_status", key: "payment_status" },
    { header: "platform_fee", key: "platform_fee" },
  ]);

  writeCsv("venue_submissions.csv", venueRows, [
    { header: "id", key: "id" },
    { header: "submitted_at", key: "submitted_at" },
    { header: "venue_name", key: "venue_name" },
    { header: "location", key: "location" },
    { header: "sport", key: "sport" },
    { header: "phone", key: "phone" },
    { header: "email", key: "email" },
    { header: "line_id", key: "line_id" },
    { header: "trust_image_id", key: "trust_image_id" },
    { header: "merchant_trade_no", key: "merchant_trade_no" },
    { header: "payment_status", key: "payment_status" },
    { header: "platform_fee", key: "platform_fee" },
  ]);

  writeCsv("teams_by_sport.csv", countBy(teams, (t) => t.sport), [
    { header: "sport", key: "name" },
    { header: "count", key: "count" },
  ]);

  writeCsv("teams_by_region.csv", countBy(teams, (t) => t.region), [
    { header: "region", key: "name" },
    { header: "count", key: "count" },
  ]);

  writeCsv("teams_by_status.csv", countBy(teams, (t) => t.status), [
    { header: "status", key: "name" },
    { header: "count", key: "count" },
  ]);

  fs.writeFileSync(
    path.join(OUT, "teams.json"),
    JSON.stringify({ exportedAt, source: "public/data/teams.json", count: teams.length, teams }, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT, "bookings.json"),
    JSON.stringify({ exportedAt, count: bookings.length, bookings }, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT, "submissions.json"),
    JSON.stringify({ exportedAt, host: hostRows, venue: venueRows }, null, 2),
    "utf8"
  );

  const liveTeams = await fetchLiveTeamCount();
  const publishedTeams = teams.filter((t) => t.status !== "hidden");
  const withPhoto = teams.filter(hasUploadedPhoto);

  const summary = {
    exportedAt,
    siteUrl: SITE,
    liveApiTeams: liveTeams,
    teams: {
      total: teams.length,
      published: publishedTeams.length,
      hidden: teams.length - publishedTeams.length,
      withUploadedPhoto: withPhoto.length,
      withoutUploadedPhoto: teams.length - withPhoto.length,
      manifestExportedAt: teamsManifest.exportedAt || null,
      bySport: countBy(teams, (t) => t.sport),
      byRegion: countBy(teams, (t) => t.region),
      byStatus: countBy(teams, (t) => t.status),
    },
    bookings: {
      total: bookings.length,
      byStatus: countBy(bookings, (b) => b.status),
      note:
        "本機 bookings.json 可能少於正式站 Netlify Blobs。正式站僅在伺服器端的預約不會出現在此匯出。",
    },
    submissions: {
      hostTotal: hostRows.length,
      venueTotal: venueRows.length,
      hostBySport: countBy(hostRows, (r) => r.sport),
      hostByPaymentStatus: countBy(hostRows, (r) => r.payment_status || "unknown"),
      note:
        "本機 submissions 可能少於正式站 Netlify Blobs。正式站表單資料以 Netlify 儲存為準。",
    },
    rowIdMapEntries: typeof rowIdMap === "object" ? Object.keys(rowIdMap).length : 0,
    outputFiles: [
      "teams.csv",
      "bookings.csv",
      "host_submissions.csv",
      "venue_submissions.csv",
      "teams_by_sport.csv",
      "teams_by_region.csv",
      "teams_by_status.csv",
      "teams.json",
      "bookings.json",
      "submissions.json",
      "summary.json",
    ],
  };

  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2), "utf8");

  fs.writeFileSync(
    path.join(OUT, "README.txt"),
    [
      "CrewPlay 後台數據匯出",
      "==================",
      "",
      `匯出時間：${exportedAt}`,
      "",
      "檔案說明：",
      "- teams.csv        全部揪團（含地區、運動、費用解析欄位）→ Excel / Python / R 分析",
      "- bookings.csv     預約紀錄（含姓名、手機、Email）",
      "- host_submissions.csv   團主入駐申請",
      "- venue_submissions.csv  場地入駐申請",
      "- teams_by_*.csv   依運動/縣市/狀態聚合",
      "- summary.json     後台儀表板摘要統計",
      "",
      "重新匯出：雙擊「匯出後台數據.bat」或執行 node scripts/export-analytics.mjs",
      "",
      "注意：含個資，請勿上傳 GitHub。正式站 Netlify 上的即時預約/表單若未同步回本機，",
      "      需從 Netlify Blobs 或之後的 Admin 匯出 API 取得完整資料。",
      "",
    ].join("\r\n"),
    "utf8"
  );

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nExported to: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
