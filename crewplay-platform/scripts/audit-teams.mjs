/**
 * Audit teams.json for publish completeness.
 * Usage: node scripts/audit-teams.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const teamsPath = path.join(__dirname, "../public/data/teams.json");
const GCS = "https://storage.googleapis.com/crewplay-arena-storage/photo/";

const REGION_CANON = {
  花蓮市: "花蓮縣",
  竹北市: "新竹縣",
  中壢市: "桃園市",
};

function normalize(name) {
  return (name || "").trim().replace(/台/g, "臺");
}

function hasUploadedPhoto(team) {
  const p = (team.photo || "").trim();
  return p.endsWith(`/photo/r${team.sheet_row}.jpg`) || p === `${GCS}r${team.sheet_row}.jpg`;
}

const raw = fs.readFileSync(teamsPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);
const teams = data.teams || [];

const report = {
  exportedAt: data.exportedAt,
  total: teams.length,
  published: 0,
  hidden: 0,
  missingFields: { region: [], location: [], sport: [], arena: [], introduce: [] },
  nonCanonicalRegion: [],
  noUploadedPhoto: [],
  byRegion: {},
  taichung: { total: 0, published: 0, withPhoto: 0, rows: [] },
};

for (const t of teams) {
  if (t.status === "hidden") report.hidden++;
  else report.published++;

  const region = normalize(t.region);
  report.byRegion[region] = (report.byRegion[region] || 0) + 1;

  if (!t.region?.trim()) report.missingFields.region.push(t.sheet_row);
  if (!t.location?.trim()) report.missingFields.location.push(t.sheet_row);
  if (!t.sport?.trim()) report.missingFields.sport.push(t.sheet_row);
  if (!t.arena_name?.trim()) report.missingFields.arena.push(t.sheet_row);
  if (!t.introduce?.trim()) report.missingFields.introduce.push(t.sheet_row);

  if (REGION_CANON[t.region]) {
    report.nonCanonicalRegion.push({
      row: t.sheet_row,
      current: t.region,
      suggest: REGION_CANON[t.region],
      arena: t.arena_name,
    });
  }

  if (!hasUploadedPhoto(t)) report.noUploadedPhoto.push(t.sheet_row);

  if (region.includes("臺中")) {
    report.taichung.total++;
    if (t.status !== "hidden") report.taichung.published++;
    if (hasUploadedPhoto(t)) report.taichung.withPhoto++;
    report.taichung.rows.push(t.sheet_row);
  }
}

console.log(JSON.stringify(report, null, 2));
