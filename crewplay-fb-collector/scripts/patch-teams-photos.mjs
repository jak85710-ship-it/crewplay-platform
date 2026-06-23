/**
 * Patch teams.json photo URLs from local photos-jpg/r{row}.jpg files.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const teamsPath = path.join(root, "../crewplay-platform/public/data/teams.json");
const jpgDir = path.join(root, "storage/photos-jpg");
const GCS = "https://storage.googleapis.com/crewplay-arena-storage/photo/";

const fromRow = Number(process.argv[2] || 97);
const toRow = Number(process.argv[3] || 278);

const raw = fs.readFileSync(teamsPath, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);
let updated = 0;

for (const team of data.teams) {
  if (team.sheet_row < fromRow || team.sheet_row > toRow) continue;
  const local = path.join(jpgDir, `r${team.sheet_row}.jpg`);
  if (!fs.existsSync(local)) continue;
  const url = `${GCS}r${team.sheet_row}.jpg`;
  if (team.photo !== url) {
    team.photo = url;
    updated++;
  }
}

data.exportedAt = new Date().toISOString();
fs.writeFileSync(teamsPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ fromRow, toRow, updated }, null, 2));
