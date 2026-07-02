import fs from "fs";
import path from "path";

import { getStore } from "@netlify/blobs";

import { issueMatchCheckInToken } from "@/lib/match-checkin-token";
import {
  type MatchPing,
  type MatchPingType,
  type MatchReview,
  type MatchSession,
  type MatchVenue,
  type PublicMatchCard,
} from "@/lib/match-types";
import {
  PILOT_MATCH_VENUE_NAME,
  PILOT_MATCH_VENUE_TEAM_ID,
} from "@/lib/member-credit-constants";

export type {
  MatchPing,
  MatchPingType,
  MatchReview,
  MatchSession,
  MatchStatus,
  MatchVenue,
  PublicMatchCard,
} from "@/lib/match-types";
export { MATCH_PING_LABELS } from "@/lib/match-types";
type MatchManifest = {
  sessions: MatchSession[];
  pings: MatchPing[];
  reviews: MatchReview[];
  updated_at: string;
};

const BLOB_STORE = "crewplay-matches";
const BLOB_KEY = "manifest";
const LOCAL_FILE = path.join(process.cwd(), ".data", "match-manifest.json");

export const PILOT_MATCH_VENUE: MatchVenue = {
  id: "pilot-wantuo",
  team_id: PILOT_MATCH_VENUE_TEAM_ID,
  name: PILOT_MATCH_VENUE_NAME,
  address: "高雄市鼓山區文忠路86號3-4F",
  region: "高雄市",
  sport_type: "桌球",
};

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): MatchManifest {
  return { sessions: [], pings: [], reviews: [], updated_at: new Date().toISOString() };
}

async function loadManifest(): Promise<MatchManifest> {
  if (useLocalFileStorage()) {
    try {
      if (!fs.existsSync(LOCAL_FILE)) return emptyManifest();
      return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as MatchManifest;
    } catch {
      return emptyManifest();
    }
  }
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (data && typeof data === "object" && "sessions" in data) {
    return data as MatchManifest;
  }
  return emptyManifest();
}

async function saveManifest(manifest: MatchManifest): Promise<void> {
  manifest.updated_at = new Date().toISOString();
  if (useLocalFileStorage()) {
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
    return;
  }
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

export function toPublicMatchCard(session: MatchSession): PublicMatchCard {
  return {
    id: session.id,
    sport_type: session.sport_type,
    skill_level: session.skill_level,
    venue_name: session.venue_name,
    venue_address: session.venue_address,
    scheduled_start: session.scheduled_start,
    scheduled_end: session.scheduled_end,
    status: session.status,
  };
}

export function isMatchParticipant(session: MatchSession, memberKey: string): boolean {
  return session.host_member_key === memberKey || session.guest_member_key === memberKey;
}

export function isPingSessionActive(session: MatchSession): boolean {
  if (session.status !== "MATCHED" && session.status !== "CHECKED_IN") return false;
  const end = new Date(session.scheduled_end);
  end.setHours(end.getHours() + 2);
  return Date.now() <= end.getTime();
}

export async function createMatchSession(input: {
  hostMemberKey: string;
  skillLevel: string;
  scheduledStart: string;
  scheduledEnd: string;
}): Promise<MatchSession> {
  const manifest = await loadManifest();
  const now = new Date().toISOString();
  const session: MatchSession = {
    id: crypto.randomUUID(),
    sport_type: PILOT_MATCH_VENUE.sport_type,
    skill_level: input.skillLevel,
    venue_id: PILOT_MATCH_VENUE.id,
    venue_name: PILOT_MATCH_VENUE.name,
    venue_address: PILOT_MATCH_VENUE.address,
    scheduled_start: input.scheduledStart,
    scheduled_end: input.scheduledEnd,
    host_member_key: input.hostMemberKey,
    guest_member_key: null,
    status: "WAITING",
    matched_at: null,
    checked_in_at: null,
    completed_at: null,
    cancelled_at: null,
    created_at: now,
    updated_at: now,
  };
  manifest.sessions.unshift(session);
  await saveManifest(manifest);
  return session;
}

export async function listWaitingMatches(): Promise<PublicMatchCard[]> {
  const manifest = await loadManifest();
  return manifest.sessions
    .filter((s) => s.status === "WAITING" && s.venue_id === PILOT_MATCH_VENUE.id)
    .map(toPublicMatchCard);
}

export async function getMatchById(id: string): Promise<MatchSession | null> {
  const manifest = await loadManifest();
  return manifest.sessions.find((s) => s.id === id) ?? null;
}

export async function joinMatchSession(
  matchId: string,
  guestMemberKey: string
): Promise<{ ok: true; session: MatchSession } | { ok: false; error: string }> {
  const manifest = await loadManifest();
  const idx = manifest.sessions.findIndex((s) => s.id === matchId);
  if (idx < 0) return { ok: false, error: "找不到對局" };

  const session = manifest.sessions[idx];
  if (session.status !== "WAITING") return { ok: false, error: "此對局已無法加入" };
  if (session.host_member_key === guestMemberKey) {
    return { ok: false, error: "無法加入自己發起的對局" };
  }
  if (session.guest_member_key) return { ok: false, error: "此對局已有對手" };

  const updated: MatchSession = {
    ...session,
    guest_member_key: guestMemberKey,
    status: "MATCHED",
    matched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  manifest.sessions[idx] = updated;
  await saveManifest(manifest);
  return { ok: true, session: updated };
}

export async function addMatchPing(
  matchId: string,
  senderMemberKey: string,
  pingType: MatchPingType
): Promise<{ ok: true; ping: MatchPing } | { ok: false; error: string }> {
  const manifest = await loadManifest();
  const session = manifest.sessions.find((s) => s.id === matchId);
  if (!session) return { ok: false, error: "找不到對局" };
  if (!isMatchParticipant(session, senderMemberKey)) {
    return { ok: false, error: "您不是此對局參與者" };
  }
  if (!isPingSessionActive(session)) {
    return { ok: false, error: "聯絡時段已結束" };
  }

  const ping: MatchPing = {
    id: crypto.randomUUID(),
    match_id: matchId,
    sender_member_key: senderMemberKey,
    ping_type: pingType,
    created_at: new Date().toISOString(),
  };
  manifest.pings.push(ping);
  await saveManifest(manifest);
  return { ok: true, ping };
}

export async function listMatchPings(matchId: string): Promise<MatchPing[]> {
  const manifest = await loadManifest();
  return manifest.pings
    .filter((p) => p.match_id === matchId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function getMatchCheckInToken(matchId: string, memberKey: string): Promise<string | null> {
  const session = await getMatchById(matchId);
  if (!session || session.status !== "MATCHED") return null;
  if (!isMatchParticipant(session, memberKey)) return null;
  return issueMatchCheckInToken(matchId);
}

export async function checkInMatchByToken(token: string): Promise<{
  ok: true;
  session: MatchSession;
} | { ok: false; error: string }> {
  const { verifyMatchCheckInToken } = await import("@/lib/match-checkin-token");
  const payload = verifyMatchCheckInToken(token);
  if (!payload) return { ok: false, error: "核銷條碼無效或已過期" };

  const manifest = await loadManifest();
  const idx = manifest.sessions.findIndex((s) => s.id === payload.matchId);
  if (idx < 0) return { ok: false, error: "找不到對局" };

  const session = manifest.sessions[idx];
  if (session.status !== "MATCHED") {
    return { ok: false, error: "此對局狀態無法核銷" };
  }

  manifest.sessions[idx] = {
    ...session,
    status: "CHECKED_IN",
    checked_in_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await saveManifest(manifest);
  return { ok: true, session: manifest.sessions[idx] };
}

export async function submitMatchReview(input: {
  matchId: string;
  reviewerMemberKey: string;
  skillMatch: boolean;
  isHarassment: boolean;
  isNoShow: boolean;
}): Promise<{ ok: true; review: MatchReview } | { ok: false; error: string }> {
  const manifest = await loadManifest();
  const session = manifest.sessions.find((s) => s.id === input.matchId);
  if (!session) return { ok: false, error: "找不到對局" };
  if (session.status !== "CHECKED_IN") {
    return { ok: false, error: "請完成到場核銷後再評價" };
  }
  if (new Date() < new Date(session.scheduled_end)) {
    return { ok: false, error: "活動尚未結束" };
  }
  if (!isMatchParticipant(session, input.reviewerMemberKey)) {
    return { ok: false, error: "您不是此對局參與者" };
  }

  const reviewee =
    session.host_member_key === input.reviewerMemberKey
      ? session.guest_member_key
      : session.host_member_key;
  if (!reviewee) return { ok: false, error: "對局資料不完整" };

  if (manifest.reviews.some((r) => r.match_id === input.matchId && r.reviewer_member_key === input.reviewerMemberKey)) {
    return { ok: false, error: "您已提交過評價" };
  }

  const review: MatchReview = {
    id: crypto.randomUUID(),
    match_id: input.matchId,
    reviewer_member_key: input.reviewerMemberKey,
    reviewee_member_key: reviewee,
    skill_match: input.skillMatch,
    is_harassment: input.isHarassment,
    is_no_show: input.isNoShow,
    admin_verified: false,
    admin_verified_at: null,
    created_at: new Date().toISOString(),
  };
  manifest.reviews.push(review);
  await saveManifest(manifest);
  return { ok: true, review };
}

export async function listMatchReviewsPendingAdmin(): Promise<MatchReview[]> {
  const manifest = await loadManifest();
  return manifest.reviews.filter((r) => r.is_no_show && !r.admin_verified);
}

export async function adminVerifyMatchNoShow(
  reviewId: string
): Promise<{ ok: true; review: MatchReview } | { ok: false; error: string }> {
  const manifest = await loadManifest();
  const idx = manifest.reviews.findIndex((r) => r.id === reviewId);
  if (idx < 0) return { ok: false, error: "找不到評價" };

  const review = manifest.reviews[idx];
  if (!review.is_no_show) return { ok: false, error: "此評價非缺席申訴" };
  if (review.admin_verified) return { ok: false, error: "已核實過" };

  const { applyMatchNoShowPenalty } = await import("@/lib/member-credit");
  await applyMatchNoShowPenalty(review.reviewee_member_key);

  manifest.reviews[idx] = {
    ...review,
    admin_verified: true,
    admin_verified_at: new Date().toISOString(),
  };
  await saveManifest(manifest);
  return { ok: true, review: manifest.reviews[idx] };
}

export async function listMemberActiveMatches(memberKey: string): Promise<MatchSession[]> {
  const manifest = await loadManifest();
  return manifest.sessions.filter(
    (s) =>
      (s.host_member_key === memberKey || s.guest_member_key === memberKey) &&
      s.status !== "CANCELLED" &&
      s.status !== "COMPLETED"
  );
}
