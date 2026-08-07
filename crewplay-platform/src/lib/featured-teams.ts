import type { Team } from "@/types";
import { isUploadedTeamPhoto } from "@/lib/utils";

const PILOT_TEAM_ID = "27882505-cb9f-4dd2-8001-2f6f2fbc107b"; // 萬拓乒乓
const NEW_TEAM_ID = "8ff7a6f5-b0e5-4fe3-a6ff-ab94e9f01f70"; // 練球團

/** 有足夠團圖時，輪播只從有圖的團挑選 */
function withPhotoPriority(teams: Team[], limit: number): Team[] {
  const withPhoto = teams.filter(isUploadedTeamPhoto);
  const withoutPhoto = teams.filter((t) => !isUploadedTeamPhoto(t));
  if (withPhoto.length >= limit) return withPhoto;
  return [...withPhoto, ...withoutPhoto];
}

function sortUploadedFirst(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const af = a.is_featured ? 1 : 0;
    const bf = b.is_featured ? 1 : 0;
    if (bf !== af) return bf - af;
    const au = isUploadedTeamPhoto(a) ? 1 : 0;
    const bu = isUploadedTeamPhoto(b) ? 1 : 0;
    return bu - au;
  });
}

function moveTeamNextToAnchor(teams: Team[], teamId: string, anchorId: string): Team[] {
  const list = [...teams];
  const teamIndex = list.findIndex((t) => t.id === teamId);
  const anchorIndex = list.findIndex((t) => t.id === anchorId);
  if (teamIndex < 0 || anchorIndex < 0) return list;

  const [team] = list.splice(teamIndex, 1);
  const insertAfter = list.findIndex((t) => t.id === anchorId);
  if (insertAfter < 0) return list;
  list.splice(insertAfter + 1, 0, team);
  return list;
}

/** 熱門運動揪團：優先顯示已上架圖片的團 */
export function pickPopularTeams(teams: Team[], limit = 12): Team[] {
  const sorted = sortUploadedFirst(withPhotoPriority(teams, limit));
  const seenSports = new Set<string>();
  const diverse: Team[] = [];
  const rest: Team[] = [];

  for (const team of sorted) {
    if (diverse.length < limit && !seenSports.has(team.sport)) {
      seenSports.add(team.sport);
      diverse.push(team);
    } else {
      rest.push(team);
    }
  }

  const selected = [...diverse, ...rest].slice(0, limit);
  if (!selected.some((t) => t.id === NEW_TEAM_ID)) {
    const incoming = sorted.find((t) => t.id === NEW_TEAM_ID);
    if (incoming) {
      selected.pop();
      selected.push(incoming);
    }
  }
  return moveTeamNextToAnchor(selected, NEW_TEAM_ID, PILOT_TEAM_ID);
}

/** 推薦揪團：依縣市輪播，讓各區都有代表 */
export function pickRecommendedTeams(teams: Team[], limit = 12): Team[] {
  const sorted = sortUploadedFirst(withPhotoPriority(teams, limit));
  const buckets = new Map<string, Team[]>();

  for (const team of sorted) {
    const key = team.region || "其他";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(team);
  }

  const result: Team[] = [];
  const keys = [...buckets.keys()].sort(
    (a, b) => (buckets.get(b)?.length ?? 0) - (buckets.get(a)?.length ?? 0)
  );

  while (result.length < limit && keys.some((k) => (buckets.get(k)?.length ?? 0) > 0)) {
    for (const key of keys) {
      const list = buckets.get(key);
      if (!list?.length) continue;
      result.push(list.shift()!);
      if (result.length >= limit) break;
    }
  }

  return result;
}
