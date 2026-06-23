import type { Team } from "@/types";
import { neighborRegions, normalizeRegionName, regionsMatch } from "@/lib/region";
import { isUploadedTeamPhoto } from "@/lib/utils";

function normalizeArenaKey(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[｜|].*$/, "");
}

/** 同一球館／團名只保留一筆，優先有圖 */
export function dedupeTeamsByArena(teams: Team[]): Team[] {
  const seen = new Map<string, Team>();
  for (const team of teams) {
    const key = normalizeArenaKey(team.arena_name);
    if (!key) continue;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, team);
      continue;
    }
    if (isUploadedTeamPhoto(team) && !isUploadedTeamPhoto(existing)) {
      seen.set(key, team);
    }
  }
  return [...seen.values()];
}

function sortPhotoFirst(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const ap = isUploadedTeamPhoto(a) ? 1 : 0;
    const bp = isUploadedTeamPhoto(b) ? 1 : 0;
    return bp - ap;
  });
}

type PickOpts = {
  region?: string | null;
  excludeIds?: Iterable<string>;
  limit?: number;
};

/** 探索附近揪團：依縣市篩選、去重、有圖優先 */
export function pickNearbyTeams(teams: Team[], opts: PickOpts = {}): Team[] {
  const limit = opts.limit ?? 12;
  const exclude = new Set(opts.excludeIds ?? []);

  let pool = teams.filter((t) => t.status !== "hidden" && !exclude.has(t.id));
  pool = dedupeTeamsByArena(pool);
  pool = sortPhotoFirst(pool);

  const withPhoto = pool.filter(isUploadedTeamPhoto);

  if (!opts.region) {
    const source = withPhoto.length >= limit ? withPhoto : pool;
    return source.slice(0, limit);
  }

  const region = normalizeRegionName(opts.region);
  const inRegion = pool.filter((t) => regionsMatch(t.region, region));
  const inRegionPhotos = inRegion.filter(isUploadedTeamPhoto);

  if (inRegionPhotos.length >= limit) {
    return inRegionPhotos.slice(0, limit);
  }
  if (inRegion.length >= limit) {
    return sortPhotoFirst(inRegion).slice(0, limit);
  }

  const expanded: Team[] = [...inRegion];
  const seenIds = new Set(expanded.map((t) => t.id));

  for (const neighbor of neighborRegions(region)) {
    for (const team of pool) {
      if (seenIds.has(team.id)) continue;
      if (!regionsMatch(team.region, neighbor)) continue;
      expanded.push(team);
      seenIds.add(team.id);
      if (expanded.length >= limit) break;
    }
    if (expanded.length >= limit) break;
  }

  if (expanded.length < limit) {
    for (const team of withPhoto.length ? withPhoto : pool) {
      if (seenIds.has(team.id)) continue;
      expanded.push(team);
      seenIds.add(team.id);
      if (expanded.length >= limit) break;
    }
  }

  return sortPhotoFirst(expanded).slice(0, limit);
}
