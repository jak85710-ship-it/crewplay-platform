import { listBookings } from "@/lib/bookings";
import { listTeamCapacityOverrides } from "@/lib/team-capacity-overrides";
import { listTeamManualMembers } from "@/lib/team-manual-members";
import { extractVolleyballPositionFromNote, VOLLEYBALL_POSITIONS, type VolleyballPosition } from "@/lib/volleyball-position";
import type { Booking, Team } from "@/types";

type CapacityInfo = {
  total: number;
  source: "manual" | "explicit" | "default";
};

const DEFAULT_CAPACITY_BY_SPORT: Record<string, number> = {
  排球: 12,
  羽球: 10,
  桌球: 8,
  籃球: 10,
  足球: 14,
  匹克球: 8,
  網球: 4,
  棒球: 18,
};

const ACTIVE_BOOKING_STATUSES = new Set(["submitted", "pending_payment", "paid"]);

function toDigitFromChinese(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  const map: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    兩: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };

  if (s === "十") return 10;
  if (s.startsWith("十")) {
    const unit = map[s.slice(1)] ?? 0;
    return 10 + unit;
  }
  if (s.endsWith("十")) {
    const tens = map[s.slice(0, -1)] ?? 0;
    return tens * 10;
  }
  if (s.includes("十")) {
    const [tensRaw, unitRaw] = s.split("十");
    const tens = map[tensRaw] ?? 0;
    const unit = map[unitRaw] ?? 0;
    return tens * 10 + unit;
  }
  return map[s] ?? null;
}

function inferCapacityFromIntroduce(team: Team, overrides?: Record<string, number>): CapacityInfo {
  const manual = overrides?.[team.id];
  if (Number.isFinite(manual) && (manual as number) > 0) {
    return { total: Number(manual), source: "manual" };
  }
  const intro = team.introduce || "";
  const checks: RegExp[] = [
    /收\s*([0-9一二兩三四五六七八九十]+)\s*人/,
    /([0-9一二兩三四五六七八九十]+)\s*人滿團/,
    /滿團\s*([0-9一二兩三四五六七八九十]+)\s*人/,
  ];

  for (const re of checks) {
    const m = intro.match(re);
    if (!m?.[1]) continue;
    const n = toDigitFromChinese(m[1]);
    if (n && n > 0) return { total: n, source: "explicit" };
  }

  const gendered = intro.match(/人數[：:]\s*(\d+)\s*男\s*(\d+)\s*女/);
  if (gendered?.[1] && gendered?.[2]) {
    return {
      total: parseInt(gendered[1], 10) + parseInt(gendered[2], 10),
      source: "explicit",
    };
  }

  const range = intro.match(/人數[：:]\s*(\d+)\s*[-~～]\s*(\d+)\s*人/);
  if (range?.[2]) {
    return { total: parseInt(range[2], 10), source: "explicit" };
  }

  const fallback = DEFAULT_CAPACITY_BY_SPORT[team.sport] ?? 10;
  return { total: fallback, source: "default" };
}

function volleyballTargetPositions(total: number): Record<VolleyballPosition, number> {
  const base: Record<VolleyballPosition, number> = {
    "主攻（大砲）": 4,
    輔舉: 2,
    攔中: 2,
    舉球: 2,
    自由球員: 2,
    都可以: 0,
  };
  if (total === 12) return base;

  const keys = VOLLEYBALL_POSITIONS.filter((k) => k !== "都可以");
  const scaledRaw = keys.map((k) => ({ key: k, raw: (base[k] / 12) * total }));
  const rounded: Record<VolleyballPosition, number> = {
    "主攻（大砲）": 0,
    輔舉: 0,
    攔中: 0,
    舉球: 0,
    自由球員: 0,
    都可以: 0,
  };

  let current = 0;
  for (const row of scaledRaw) {
    const v = Math.floor(row.raw);
    rounded[row.key] = v;
    current += v;
  }

  let remaining = Math.max(0, total - current);
  const byFraction = [...scaledRaw].sort((a, b) => (b.raw - Math.floor(b.raw)) - (a.raw - Math.floor(a.raw)));
  let idx = 0;
  while (remaining > 0 && byFraction.length > 0) {
    const key = byFraction[idx % byFraction.length].key;
    rounded[key] += 1;
    remaining -= 1;
    idx += 1;
  }

  return rounded;
}

export type TeamBookingStats = {
  totalSlots: number;
  manualMembers: number;
  usedSlots: number;
  remainingSlots: number;
  isFull: boolean;
  activeBookings: number;
  capacitySource: "manual" | "explicit" | "default";
  volleyball?: {
    targets: Record<VolleyballPosition, number>;
    booked: Record<VolleyballPosition, number>;
    missing: Record<VolleyballPosition, number>;
  };
};

function computeTeamBookingStats(
  team: Team,
  bookings: Booking[],
  overrides?: Record<string, number>,
  manualMembersById?: Record<string, number>
): TeamBookingStats {
  const cap = inferCapacityFromIntroduce(team, overrides);
  const active = bookings.filter(
    (b) => b.team_id === team.id && ACTIVE_BOOKING_STATUSES.has(b.status)
  );

  const bookingSlots = active.reduce((sum, b) => sum + Math.max(1, Number(b.slots || 1)), 0);
  const manualMembers = Math.max(0, Math.floor(Number(manualMembersById?.[team.id] || 0)));
  const usedSlots = bookingSlots + manualMembers;
  const remainingSlots = Math.max(0, cap.total - usedSlots);
  const base: TeamBookingStats = {
    totalSlots: cap.total,
    manualMembers,
    usedSlots,
    remainingSlots,
    isFull: remainingSlots <= 0,
    activeBookings: active.length,
    capacitySource: cap.source,
  };

  if (team.sport !== "排球") return base;

  const targets = volleyballTargetPositions(cap.total);
  const emptyBooked: Record<VolleyballPosition, number> = {
    "主攻（大砲）": 0,
    輔舉: 0,
    攔中: 0,
    舉球: 0,
    自由球員: 0,
    都可以: 0,
  };

  for (const booking of active) {
    const pos = extractVolleyballPositionFromNote(booking.note).position;
    if (!pos) continue;
    emptyBooked[pos] += Math.max(1, Number(booking.slots || 1));
  }

  const missing: Record<VolleyballPosition, number> = {
    "主攻（大砲）": Math.max(0, targets["主攻（大砲）"] - emptyBooked["主攻（大砲）"]),
    輔舉: Math.max(0, targets.輔舉 - emptyBooked.輔舉),
    攔中: Math.max(0, targets.攔中 - emptyBooked.攔中),
    舉球: Math.max(0, targets.舉球 - emptyBooked.舉球),
    自由球員: Math.max(0, targets.自由球員 - emptyBooked.自由球員),
    都可以: 0,
  };

  return {
    ...base,
    volleyball: {
      targets,
      booked: emptyBooked,
      missing,
    },
  };
}

export async function getTeamBookingStats(team: Team): Promise<TeamBookingStats> {
  const [bookings, overrides, manualMembersById] = await Promise.all([
    listBookings(),
    listTeamCapacityOverrides(),
    listTeamManualMembers(),
  ]);
  return computeTeamBookingStats(team, bookings, overrides, manualMembersById);
}

export async function getTeamBookingStatsMap(teams: Team[]): Promise<Record<string, TeamBookingStats>> {
  if (teams.length === 0) return {};
  const [bookings, overrides, manualMembersById] = await Promise.all([
    listBookings(),
    listTeamCapacityOverrides(),
    listTeamManualMembers(),
  ]);
  const map: Record<string, TeamBookingStats> = {};
  for (const team of teams) {
    map[team.id] = computeTeamBookingStats(team, bookings, overrides, manualMembersById);
  }
  return map;
}
