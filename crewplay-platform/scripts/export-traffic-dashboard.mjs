/**
 * 從正式站拉流量 → 生成本地 HTML 儀表板（雙擊即可看）
 * Usage: node scripts/export-traffic-dashboard.mjs
 * 需設定 ADMIN_API_KEY（Netlify 環境變數，或本機 .env.local）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data-export");
const SITE = process.env.CREWPLAY_SITE_URL || "https://www.crewplay.tw";
const LOCAL_EVENTS = path.join(ROOT, ".data", "analytics-events.json");

const FUNNEL_STEPS = [
  { name: "home", label: "進入首頁", index: 1 },
  { name: "teams_list", label: "瀏覽揪團列表", index: 2 },
  { name: "team_detail", label: "查看團詳情", index: 3 },
  { name: "book_form", label: "填寫預約表單", index: 4 },
  { name: "book_success", label: "完成預約送出", index: 5 },
  { name: "login", label: "登入頁", index: 6 },
  { name: "my_bookings", label: "我的預約", index: 7 },
  { name: "join_host", label: "團主入駐", index: 8 },
  { name: "join_venue", label: "場地入駐", index: 9 },
];

function loadAdminKey() {
  if (process.env.ADMIN_API_KEY?.trim()) return process.env.ADMIN_API_KEY.trim();
  for (const file of [".env.local", ".env"]) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(/^ADMIN_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return "";
}

function buildTrafficSummary(events) {
  const funnelEvents = events.filter((e) => e.type === "funnel");
  const actionEvents = events.filter((e) => e.type === "action");
  const sessionMaxStep = new Map();
  const sessionDays = new Map();
  const dailyPageViews = new Map();

  for (const e of funnelEvents) {
    const sid = e.session_id || "anonymous";
    const idx = e.step_index ?? 0;
    sessionMaxStep.set(sid, Math.max(sessionMaxStep.get(sid) ?? 0, idx));
    const day = e.ts.slice(0, 10);
    if (!sessionDays.has(day)) sessionDays.set(day, new Set());
    sessionDays.get(day).add(sid);
    dailyPageViews.set(day, (dailyPageViews.get(day) ?? 0) + 1);
  }

  const funnel = FUNNEL_STEPS.map((step, i) => {
    const sessions = [...sessionMaxStep.values()].filter((max) => max >= step.index).length;
    const prevSessions =
      i === 0
        ? sessions
        : [...sessionMaxStep.values()].filter((max) => max >= FUNNEL_STEPS[i - 1].index).length;
    const dropFromPrev = i === 0 ? null : prevSessions - sessions;
    const dropRateFromPrev =
      i === 0 || prevSessions === 0 ? null : Math.round((1 - sessions / prevSessions) * 1000) / 10;
    return { ...step, sessions, dropFromPrev, dropRateFromPrev };
  });

  const actionMap = new Map();
  for (const e of actionEvents) {
    const key = e.action || "unknown";
    actionMap.set(key, (actionMap.get(key) ?? 0) + 1);
  }

  return {
    uniqueSessions: sessionMaxStep.size,
    funnel,
    actions: [...actionMap.entries()]
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count),
    dailySessions: [...sessionDays.entries()]
      .map(([date, set]) => ({ date, sessions: set.size, pageViews: dailyPageViews.get(date) ?? 0 }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    lastEventAt: events.length ? events[events.length - 1].ts : null,
  };
}

function buildDashboardHtml(payload) {
  const { exportedAt, totalEvents, summary, source } = payload;
  const maxFunnel = Math.max(1, ...summary.funnel.map((f) => f.sessions));

  const funnelRows = summary.funnel
    .map((f) => {
      const width = Math.round((f.sessions / maxFunnel) * 100);
      const drop =
        f.dropRateFromPrev == null
          ? "—"
          : f.dropRateFromPrev > 0
            ? `流失 ${f.dropRateFromPrev}%（-${f.dropFromPrev} 人）`
            : "—";
      return `<tr>
        <td>${f.index}. ${f.label}</td>
        <td><strong>${f.sessions}</strong> 人次</td>
        <td><div class="bar"><span style="width:${width}%"></span></div></td>
        <td class="muted">${drop}</td>
      </tr>`;
    })
    .join("");

  const actionRows =
    summary.actions.length === 0
      ? '<tr><td colspan="2" class="muted">尚無行為紀錄</td></tr>'
      : summary.actions
          .map((a) => `<tr><td>${a.action}</td><td><strong>${a.count}</strong></td></tr>`)
          .join("");

  const dailyRows =
    summary.dailySessions.length === 0
      ? '<tr><td colspan="3" class="muted">尚無每日資料</td></tr>'
      : summary.dailySessions
          .slice(-14)
          .map(
            (d) =>
              `<tr><td>${d.date}</td><td>${d.sessions}</td><td>${d.pageViews}</td></tr>`
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CrewPlay 流量儀表板</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", "Microsoft JhengHei", sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
    h1 { font-size: 1.5rem; margin: 0 0 4px; }
    .sub { color: #64748b; font-size: 0.875rem; margin-bottom: 24px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .card { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
    .card .n { font-size: 1.75rem; font-weight: 700; color: #0d9488; }
    .card .l { font-size: 0.75rem; color: #64748b; margin-top: 4px; }
    section { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 16px; }
    h2 { font-size: 1rem; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    th { color: #64748b; font-weight: 600; }
    .muted { color: #94a3b8; }
    .bar { background: #e2e8f0; border-radius: 999px; height: 8px; overflow: hidden; min-width: 80px; }
    .bar span { display: block; height: 100%; background: linear-gradient(90deg, #14b8a6, #0d9488); border-radius: 999px; }
    .tip { background: #ecfdf5; border: 1px solid #99f6e4; color: #115e59; padding: 12px 14px; border-radius: 10px; font-size: 0.8125rem; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>CrewPlay 流量儀表板</h1>
    <p class="sub">資料來源：${source} · 匯出時間：${exportedAt}${summary.lastEventAt ? ` · 最後事件：${summary.lastEventAt}` : ""}</p>

    <div class="cards">
      <div class="card"><div class="n">${summary.uniqueSessions}</div><div class="l">不重複訪客（工作階段）</div></div>
      <div class="card"><div class="n">${totalEvents}</div><div class="l">事件總數</div></div>
      <div class="card"><div class="n">${summary.funnel[0]?.sessions ?? 0}</div><div class="l">進入首頁</div></div>
      <div class="card"><div class="n">${summary.funnel[4]?.sessions ?? 0}</div><div class="l">完成預約</div></div>
    </div>

    <section>
      <h2>使用漏斗（在哪一步離開）</h2>
      <p class="muted" style="margin:0 0 12px;font-size:0.8125rem">數字代表「至少到達此步驟」的人次；越往下越少即為流失。</p>
      <table>
        <thead><tr><th>步驟</th><th>人數</th><th>比例</th><th>上一步流失</th></tr></thead>
        <tbody>${funnelRows}</tbody>
      </table>
    </section>

    <section>
      <h2>關鍵行為</h2>
      <table><thead><tr><th>行為</th><th>次數</th></tr></thead><tbody>${actionRows}</tbody></table>
    </section>

    <section>
      <h2>近 14 日流量</h2>
      <table><thead><tr><th>日期</th><th>訪客數</th><th>頁面瀏覽</th></tr></thead><tbody>${dailyRows}</tbody></table>
    </section>

    <p class="tip">重新匯出：雙擊「匯出流量數據.bat」。部署新版追蹤後需等訪客造訪網站才會累積資料。</p>
  </div>
</body>
</html>`;
}

async function fetchRemoteEvents(adminKey) {
  const url = `${SITE}/api/analytics/export?key=${encodeURIComponent(adminKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function readLocalEvents() {
  if (!fs.existsSync(LOCAL_EVENTS)) return { events: [], source: "本機 .data（尚無資料）" };
  const data = JSON.parse(fs.readFileSync(LOCAL_EVENTS, "utf8"));
  return { events: data.events ?? [], source: "本機 .data/analytics-events.json" };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const adminKey = loadAdminKey();
  let events = [];
  let source = "";

  if (adminKey) {
    try {
      const remote = await fetchRemoteEvents(adminKey);
      events = remote.events ?? [];
      source = SITE;
    } catch (err) {
      console.warn("無法從正式站拉資料，改讀本機：", err.message);
      const local = readLocalEvents();
      events = local.events;
      source = local.source;
    }
  } else {
    console.warn("未設定 ADMIN_API_KEY，僅讀本機 dev 資料。");
    const local = readLocalEvents();
    events = local.events;
    source = local.source;
  }

  const summary = buildTrafficSummary(events);
  const payload = {
    exportedAt: new Date().toISOString(),
    totalEvents: events.length,
    source,
    summary,
    events,
  };

  fs.writeFileSync(path.join(OUT, "traffic-events.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT, "traffic-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT, "流量儀表板.html"), buildDashboardHtml(payload), "utf8");

  fs.writeFileSync(
    path.join(OUT, "流量說明.txt"),
    [
      "CrewPlay 本地流量數據",
      "================",
      "",
      "雙擊開啟：流量儀表板.html",
      "",
      "重新匯出：匯出流量數據.bat",
      "",
      "正式站需先在 Netlify 設定 ADMIN_API_KEY，並部署含流量追蹤的版本。",
      "本機 .env.local 可寫：ADMIN_API_KEY=你的金鑰",
      "",
      `本次事件數：${events.length}`,
      `不重複訪客：${summary.uniqueSessions}`,
    ].join("\r\n"),
    "utf8"
  );

  console.log(JSON.stringify({ exportedTo: OUT, totalEvents: events.length, uniqueSessions: summary.uniqueSessions, source }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
