import { approveBookingById, cancelBookingByAdmin, getBookingById, listBookings } from "@/lib/bookings";
import { sendBookingQueueAutoCancelNotice } from "@/lib/email";
import { pushLineQueueAutoCancelNotice } from "@/lib/line-notify";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { listTeamManualMembers } from "@/lib/team-manual-members";
import { getTeamBookingStatsMap } from "@/lib/team-booking-stats";
import { getAllTeams } from "@/lib/teams";
import { parseIntroField } from "@/lib/utils";
import type { MemberSession } from "@/lib/member-session";
import type { Booking, Team } from "@/types";

const PENDING_REVIEW_STATUS: Booking["status"] = "submitted";
const APPROVED_STATUS: Booking["status"] = "paid";
const MS_IN_HOUR = 60 * 60 * 1000;

type AutoCancelReason = "sla_24h" | "sla_before_start_12h" | "full_auto_reject";

function parseStartAtFromTeam(team: Team): Date | null {
  const text = [parseIntroField(team.introduce || "", "時間"), team.introduce || ""].filter(Boolean).join(" ");
  const full = text.match(/(20\d{2})[\/\-年](\d{1,2})[\/\-月](\d{1,2})[日號]?[^\d]{0,6}(\d{1,2})[:：](\d{2})/);
  if (full) {
    const [_, y, m, d, hh, mm] = full;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const partial = text.match(/(\d{1,2})[\/\-月](\d{1,2})[日號]?[^\d]{0,6}(\d{1,2})[:：](\d{2})/);
  if (!partial) return null;
  const now = new Date();
  const [__, m, d, hh, mm] = partial;
  let year = now.getFullYear();
  let dt = new Date(year, Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
  if (dt.getTime() < now.getTime() - 30 * 24 * MS_IN_HOUR) {
    year += 1;
    dt = new Date(year, Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
  }
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function resolveSlaReason(booking: Booking, team: Team, nowMs: number): AutoCancelReason | null {
  const createdAtMs = booking.created_at ? new Date(booking.created_at).getTime() : NaN;
  if (!Number.isFinite(createdAtMs)) return null;
  const deadline24h = createdAtMs + 24 * MS_IN_HOUR;
  if (nowMs >= deadline24h) {
    return "sla_24h";
  }

  const startAt = parseStartAtFromTeam(team);
  if (!startAt) return null;
  const deadline12hBefore = startAt.getTime() - 12 * MS_IN_HOUR;
  if (nowMs >= deadline12hBefore) {
    return "sla_before_start_12h";
  }
  return null;
}

async function notifyGuestAutoCancelled(booking: Booking, teamName: string, reason: AutoCancelReason) {
  try {
    await sendBookingQueueAutoCancelNotice({
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      teamName,
      bookingId: booking.id,
      reason,
    });
  } catch (err) {
    console.error("sendBookingQueueAutoCancelNotice failed:", err);
  }
  try {
    await pushLineQueueAutoCancelNotice({
      lineUid: booking.line_uid,
      teamName,
      reason,
    });
  } catch (err) {
    console.error("pushLineQueueAutoCancelNotice failed:", err);
  }
}

async function autoCancelBooking(booking: Booking, teamName: string, reason: AutoCancelReason): Promise<boolean> {
  const result = await cancelBookingByAdmin(booking.id);
  if (!result.ok) return false;
  if (!result.alreadyCancelled) {
    await notifyGuestAutoCancelled(booking, teamName, reason);
  }
  return !result.alreadyCancelled;
}

async function rejectPendingQueueIfFull(team: Team, bookings: Booking[]): Promise<number> {
  const statsMap = await getTeamBookingStatsMap([team]);
  const cap = statsMap[team.id];
  if (!cap) return 0;

  const manualMembersMap = await listTeamManualMembers();
  const manualMembers = Math.max(0, Math.floor(Number(manualMembersMap[team.id] || 0)));
  const approvedSlots = bookings
    .filter((b) => b.team_id === team.id && b.status === APPROVED_STATUS)
    .reduce((sum, b) => sum + Math.max(1, Number(b.slots || 1)), 0);

  if (approvedSlots + manualMembers < cap.totalSlots) return 0;
  const queued = bookings.filter((b) => b.team_id === team.id && b.status === PENDING_REVIEW_STATUS);
  if (queued.length === 0) return 0;

  let rejected = 0;
  for (const booking of queued) {
    const changed = await autoCancelBooking(booking, team.arena_name, "full_auto_reject");
    if (changed) rejected += 1;
  }
  return rejected;
}

export async function processBookingReviewSla(options?: { teamIds?: string[] }): Promise<{
  slaCancelled: number;
  fullAutoRejected: number;
}> {
  const [teams, bookings] = await Promise.all([getAllTeams(), listBookings()]);
  const filterIds = options?.teamIds?.length ? new Set(options.teamIds) : null;
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const nowMs = Date.now();
  let slaCancelled = 0;
  let fullAutoRejected = 0;

  for (const booking of bookings) {
    if (booking.status !== PENDING_REVIEW_STATUS) continue;
    if (filterIds && !filterIds.has(booking.team_id)) continue;
    const team = teamMap.get(booking.team_id);
    if (!team) continue;
    const reason = resolveSlaReason(booking, team, nowMs);
    if (!reason) continue;
    const changed = await autoCancelBooking(booking, team.arena_name, reason);
    if (changed) slaCancelled += 1;
  }

  const candidateTeams = filterIds
    ? teams.filter((team) => filterIds.has(team.id))
    : teams;
  const latestBookings = await listBookings();
  for (const team of candidateTeams) {
    fullAutoRejected += await rejectPendingQueueIfFull(team, latestBookings);
  }

  return { slaCancelled, fullAutoRejected };
}

export async function reviewBookingAsHost(input: {
  member: MemberSession;
  bookingId: string;
  action: "approve" | "reject";
}): Promise<
  | { ok: true; booking: Booking; fullAutoRejected: number }
  | { ok: false; error: string; code?: string }
> {
  if (!input.member.isLoggedIn) {
    return { ok: false, error: "請先登入團主帳號", code: "unauthorized" };
  }
  const booking = await getBookingById(input.bookingId);
  if (!booking) {
    return { ok: false, error: "找不到預約", code: "not_found" };
  }

  const ownedTeams = await listOwnedTeamsForMember(input.member);
  const ownedSet = new Set(ownedTeams.map((t) => t.id));
  if (!ownedSet.has(booking.team_id)) {
    return { ok: false, error: "您只能審核自己開的團", code: "forbidden" };
  }

  if (booking.status === "cancelled") {
    return { ok: false, error: "此預約已取消", code: "already_cancelled" };
  }
  if (booking.status === "no_show" || booking.status === "refunded") {
    return { ok: false, error: "此預約狀態無法審核", code: "invalid_status" };
  }

  if (input.action === "reject") {
    const cancelled = await cancelBookingByAdmin(booking.id);
    if (!cancelled.ok) {
      return { ok: false, error: cancelled.error, code: cancelled.code };
    }
    const updated = await getBookingById(booking.id);
    if (!updated) {
      return { ok: false, error: "找不到審核後預約", code: "not_found" };
    }
    return { ok: true, booking: updated, fullAutoRejected: 0 };
  }

  if (booking.status !== PENDING_REVIEW_STATUS) {
    return { ok: false, error: "此預約已審核過", code: "already_reviewed" };
  }

  const approved = await approveBookingById(booking.id);
  if (!approved) {
    return { ok: false, error: "核准失敗，請稍後再試", code: "server" };
  }
  const { fullAutoRejected } = await processBookingReviewSla({ teamIds: [booking.team_id] });
  return { ok: true, booking: approved, fullAutoRejected };
}
