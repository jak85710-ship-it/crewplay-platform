import type { Team } from "@/types";

export const BOOKING_PAUSE_MESSAGE =
  "目前未開放預約，請先與團主確認後再開放。";

const BOOKING_OPEN_TEAM_IDS = new Set<string>([
  // 洪竿女子排球
  "9a54fdbf-74d8-42b6-a441-dc1dde628d5f",
]);

function normalizeText(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export function isBookingOpenForTeam(
  team: Pick<Team, "arena_name"> & Partial<Pick<Team, "id">>
): boolean {
  const teamId = String(team.id || "").trim();
  if (teamId && BOOKING_OPEN_TEAM_IDS.has(teamId)) {
    return true;
  }

  const arenaName = normalizeText(String(team.arena_name || ""));
  return arenaName.includes("萬拓乒乓") || arenaName.includes("洪竿女子排球");
}
