import fs from "fs";
import path from "path";

import type { Team } from "@/types";

type DelistedManifest = {
  sheet_rows?: number[];
  team_ids?: string[];
  arena_names?: string[];
};

let cached: {
  rows: Set<number>;
  ids: Set<string>;
  names: Set<string>;
} | null = null;

function loadDelisted() {
  if (cached) return cached;

  const rows = new Set<number>();
  const ids = new Set<string>();
  const names = new Set<string>();

  try {
    const filePath = path.join(process.cwd(), "public", "data", "delisted-teams.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
      const data = JSON.parse(raw) as DelistedManifest;
      for (const row of data.sheet_rows ?? []) rows.add(Number(row));
      for (const id of data.team_ids ?? []) ids.add(String(id));
      for (const name of data.arena_names ?? []) names.add(String(name).trim());
    }
  } catch {
    /* ignore */
  }

  cached = { rows, ids, names };
  return cached;
}

export function isDelistedTeam(team: Pick<Team, "id" | "sheet_row" | "arena_name">): boolean {
  const delisted = loadDelisted();
  if (delisted.ids.has(team.id)) return true;
  if (delisted.rows.has(team.sheet_row)) return true;
  if (delisted.names.has(team.arena_name.trim())) return true;
  return false;
}

export function filterListedTeams(teams: Team[]): Team[] {
  return teams.filter((t) => t.status !== "hidden" && !isDelistedTeam(t));
}
