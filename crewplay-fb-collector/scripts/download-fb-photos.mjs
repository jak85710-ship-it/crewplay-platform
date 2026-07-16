/**
 * Download best FB post image (og:image) for sheet rows, save to photos-inbox + photos-jpg.
 * Usage: node scripts/download-fb-photos.mjs [--from 97] [--to 278] [--dry-run]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const teamsPath = path.join(root, "../crewplay-platform/public/data/teams.json");
const inboxDir = path.join(root, "storage/photos-inbox");
const jpgDir = path.join(root, "storage/photos-jpg");

const args = process.argv.slice(2);
const fromRow = Number(args[args.indexOf("--from") + 1] || 97);
const toRow = Number(args[args.indexOf("--to") + 1] || 278);
const dryRun = args.includes("--dry-run");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function findInboxSource(row) {
  const base = path.join(inboxDir, String(row));
  for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
    const p = base + ext;
    if (fs.existsSync(p)) return p;
  }
  const files = fs.readdirSync(inboxDir);
  const re = new RegExp(`^a?${row}(\\.|\\s|\\()`, "i");
  const hit = files.find((f) => re.test(f));
  return hit ? path.join(inboxDir, hit) : null;
}

function toMbasicUrl(postUrl) {
  return postUrl.replace(/^https:\/\/www\.facebook\.com/i, "https://mbasic.facebook.com");
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  return res.text();
}

function parseBestImage(html) {
  const patterns = [
    /property="og:image" content="([^"]+)"/i,
    /content="([^"]+)" property="og:image"/i,
    /"og:image":"([^"]+)"/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].replace(/&amp;/g, "&");
  }
  const scontent = [...html.matchAll(/(?:src|href)="(https:\/\/[^"]*scontent[^"]*fbcdn[^"]+)"/gi)]
    .map((m) => m[1].replace(/&amp;/g, "&"))
    .filter((u) => !/emoji|static|rsrc\.php/i.test(u));
  if (scontent.length) {
    scontent.sort((a, b) => b.length - a.length);
    return scontent[0];
  }
  return null;
}

async function fetchOgImage(postUrl) {
  for (const url of [postUrl, toMbasicUrl(postUrl)]) {
    try {
      const html = await fetchHtml(url);
      const img = parseBestImage(html);
      if (img) return img;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://www.facebook.com/" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("File too small");
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function convertWithSharp(srcPath, destPath) {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    return false;
  }
  await sharp(srcPath)
    .rotate()
    .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(destPath);
  return true;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(teamsPath, "utf8").replace(/^\uFEFF/, ""));
  const teams = data.teams.filter(
    (t) => t.sheet_row >= fromRow && t.sheet_row <= toRow && t.assign_url?.includes("facebook.com")
  );

  const report = { fromRow, toRow, dryRun, ok: [], skipped: [], failed: [] };

  for (const team of teams) {
    const row = team.sheet_row;
    const destJpg = path.join(jpgDir, `r${row}.jpg`);
    if (fs.existsSync(destJpg)) {
      report.skipped.push({ row, reason: "already_has_r_jpg" });
      continue;
    }

    const inbox = findInboxSource(row);
    if (inbox) {
      if (dryRun) {
        report.ok.push({ row, source: "inbox", path: inbox });
        continue;
      }
      try {
        const tmp = path.join(jpgDir, `_tmp_${row}.jpg`);
        const converted = await convertWithSharp(inbox, destJpg);
        if (!converted) {
          fs.copyFileSync(inbox, destJpg);
        }
        report.ok.push({ row, source: "inbox", path: inbox, destJpg });
        continue;
      } catch (e) {
        report.failed.push({ row, error: `inbox: ${e.message}` });
        continue;
      }
    }

    try {
      const og = await fetchOgImage(team.assign_url);
      if (!og) {
        report.failed.push({ row, error: "no og:image", assign_url: team.assign_url });
        continue;
      }
      if (dryRun) {
        report.ok.push({ row, source: "og:image", url: og.slice(0, 100) });
        continue;
      }
      const inboxPath = path.join(inboxDir, `${row}.jpg`);
      await downloadImage(og, inboxPath);
      const converted = await convertWithSharp(inboxPath, destJpg);
      if (!converted) {
        fs.copyFileSync(inboxPath, destJpg);
      }
      report.ok.push({ row, source: "og:image", destJpg, bytes: fs.statSync(destJpg).size });
    } catch (e) {
      report.failed.push({ row, error: e.message, assign_url: team.assign_url });
    }
  }

  const outPath = path.join(root, "download-fb-photos-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, ok: report.ok.length, skipped: report.skipped.length, failed: report.failed.length }, null, 2));
  console.log("Report:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
