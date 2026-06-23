/**
 * Sync teams.json: r{row}.jpg only for rows with inbox source + converted JPG; else a1.jpg (logo).
 * Reads inbox-publish-report.json from convert step.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const teamsPath = path.join(root, "../crewplay-platform/public/data/teams.json");
const reportPath = path.join(root, "inbox-publish-report.json");
const GCS = "https://storage.googleapis.com/crewplay-arena-storage/photo/";
const DEFAULT = `${GCS}a1.jpg`;

const report = JSON.parse(fs.readFileSync(reportPath, "utf8").replace(/^\uFEFF/, ""));
const uploadedRows = new Set(report.uploadedRows || report.convertedRows || []);

const raw = fs.readFileSync(teamsPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);
let withPhoto = 0;
let withLogo = 0;

for (const team of data.teams) {
  const url = uploadedRows.has(team.sheet_row) ? `${GCS}r${team.sheet_row}.jpg` : DEFAULT;
  team.photo = url;
  if (url === DEFAULT) withLogo++;
  else withPhoto++;
}

data.exportedAt = new Date().toISOString();
fs.writeFileSync(teamsPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ withPhoto, withLogo, total: data.teams.length }, null, 2));
