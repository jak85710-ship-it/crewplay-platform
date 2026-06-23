/**
 * Reset teams to logo (a1.jpg) when local JPG is missing or duplicated (not a real unique photo).
 * Keeps r{row}.jpg only when the file exists and its MD5 is unique among all r*.jpg.
 *
 * Usage: node scripts/revert-duplicate-photos.mjs [--dry-run]
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const teamsPath = path.join(root, "../crewplay-platform/public/data/teams.json");
const jpgDir = path.join(root, "storage/photos-jpg");
const reportPath = path.join(root, "revert-duplicate-photos-report.json");

const GCS = "https://storage.googleapis.com/crewplay-arena-storage/photo/";
const DEFAULT = `${GCS}a1.jpg`;
const dryRun = process.argv.includes("--dry-run");

function md5File(filePath) {
  return crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
}

const hashToRows = new Map();
for (const name of fs.readdirSync(jpgDir)) {
  const m = name.match(/^r(\d+)\.jpg$/);
  if (!m) continue;
  const row = Number(m[1]);
  const hash = md5File(path.join(jpgDir, name));
  if (!hashToRows.has(hash)) hashToRows.set(hash, []);
  hashToRows.get(hash).push(row);
}

const uniqueRows = new Set(
  [...hashToRows.values()].filter((rows) => rows.length === 1).flat()
);

function photoForRow(row) {
  const local = path.join(jpgDir, `r${row}.jpg`);
  if (!fs.existsSync(local)) return DEFAULT;
  if (!uniqueRows.has(row)) return DEFAULT;
  return `${GCS}r${row}.jpg`;
}

const raw = fs.readFileSync(teamsPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);

const kept = [];
const reverted = [];

for (const team of data.teams) {
  const next = photoForRow(team.sheet_row);
  if (next === DEFAULT) reverted.push(team.sheet_row);
  else kept.push(team.sheet_row);
  if (!dryRun && team.photo !== next) team.photo = next;
}

const report = {
  at: new Date().toISOString(),
  dryRun,
  total: data.teams.length,
  keptUniquePhoto: kept.length,
  revertedToLogo: reverted.length,
  keptRows: kept.sort((a, b) => a - b),
  revertedRows: reverted.sort((a, b) => a - b),
};

if (!dryRun) {
  data.exportedAt = new Date().toISOString();
  fs.writeFileSync(teamsPath, JSON.stringify(data, null, 2) + "\n", "utf8");
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
