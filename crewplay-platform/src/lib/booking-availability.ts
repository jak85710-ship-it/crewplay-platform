import type { Team } from "@/types";

export const BOOKING_PAUSE_MESSAGE =
  "目前未開放預約，請先與團主確認後再開放。";

export function isBookingOpenForTeam(
  _team: Pick<Team, "arena_name"> & Partial<Pick<Team, "id">>
): boolean {
  // 全面開放預約；滿團限制仍由各頁與 API 的 stats.isFull 邏輯擋單。
  return true;
}
