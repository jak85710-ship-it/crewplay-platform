import type { Team } from "@/types";

export const BOOKING_PAUSE_MESSAGE =
  "目前未開放預約，請先與團主確認後再開放。";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export function isBookingOpenForTeam(team: Pick<Team, "arena_name">): boolean {
  const arenaName = normalizeText(String(team.arena_name || ""));
  return arenaName.includes("萬拓乒乓");
}
