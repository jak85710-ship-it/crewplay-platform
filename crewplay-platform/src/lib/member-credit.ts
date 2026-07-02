import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

import {
  DEFAULT_CREDIT_SCORE,
  MATCH_NO_SHOW_LOCK_DAYS,
  MIN_BOOKING_SCORE,
  MIN_MATCH_SCORE,
  NO_SHOW_PENALTY,
} from "@/lib/member-credit-constants";

export {
  DEFAULT_CREDIT_SCORE,
  MATCH_NO_SHOW_LOCK_DAYS,
  MIN_BOOKING_SCORE,
  MIN_MATCH_SCORE,
  NO_SHOW_PENALTY,
};

export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export type MemberCreditProfile = {
  member_key: string;
  credit_score: number;
  no_show_count: number;
  verification_status?: VerificationStatus;
  verification_image_id?: string;
  verified_at?: string;
  verified_by_admin?: string;
  rejection_reason?: string;
  match_locked_until?: string | null;
  display_name?: string;
  email?: string;
  line_uid?: string;
  apple_uid?: string;
  phone?: string;
  updated_at: string;
};

type MembersManifest = {
  profiles: Record<string, MemberCreditProfile>;
  updated_at: string;
};

const BLOB_STORE = "crewplay-members";
const BLOB_KEY = "profiles";
const LOCAL_FILE = path.join(process.cwd(), ".data", "member-profiles.json");

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): MembersManifest {
  return { profiles: {}, updated_at: new Date().toISOString() };
}

function readLocalManifest(): MembersManifest {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return emptyManifest();
    return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as MembersManifest;
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: MembersManifest) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<MembersManifest> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (data && typeof data === "object" && "profiles" in data) {
    return data as MembersManifest;
  }
  return emptyManifest();
}

async function writeBlobManifest(manifest: MembersManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  manifest.updated_at = new Date().toISOString();
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<MembersManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: MembersManifest): Promise<void> {
  manifest.updated_at = new Date().toISOString();
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

function defaultProfile(memberKey: string): MemberCreditProfile {
  return {
    member_key: memberKey,
    credit_score: DEFAULT_CREDIT_SCORE,
    no_show_count: 0,
    verification_status: "none",
    match_locked_until: null,
    updated_at: new Date().toISOString(),
  };
}

export function isVerificationApproved(profile: MemberCreditProfile): boolean {
  return profile.verification_status === "approved";
}

export function isMatchFeatureLocked(profile: MemberCreditProfile): boolean {
  if (!profile.match_locked_until) return false;
  return new Date(profile.match_locked_until) > new Date();
}

export function canMatchWithScore(score: number): boolean {
  return score >= MIN_MATCH_SCORE;
}

export async function getMemberCredit(memberKey: string): Promise<MemberCreditProfile> {
  const manifest = await loadManifest();
  return manifest.profiles[memberKey] ?? defaultProfile(memberKey);
}

export async function touchMemberProfile(
  memberKey: string,
  hints: {
    displayName?: string;
    email?: string;
    lineUid?: string;
    appleUid?: string;
    phone?: string;
  }
): Promise<MemberCreditProfile> {
  const manifest = await loadManifest();
  const existing = manifest.profiles[memberKey] ?? defaultProfile(memberKey);
  const profile: MemberCreditProfile = {
    ...existing,
    updated_at: new Date().toISOString(),
  };
  if (hints.displayName?.trim()) profile.display_name = hints.displayName.trim().slice(0, 80);
  if (hints.email?.trim()) profile.email = hints.email.trim().toLowerCase();
  if (hints.lineUid) profile.line_uid = hints.lineUid;
  if (hints.appleUid) profile.apple_uid = hints.appleUid;
  if (hints.phone) profile.phone = hints.phone;
  manifest.profiles[memberKey] = profile;
  await saveManifest(manifest);
  return profile;
}

export function canBookWithScore(score: number): boolean {
  return score >= MIN_BOOKING_SCORE;
}

export async function checkMemberCanBook(memberKey: string): Promise<{
  allowed: boolean;
  credit_score: number;
  no_show_count: number;
  min_score: number;
}> {
  const profile = await getMemberCredit(memberKey);
  return {
    allowed: canBookWithScore(profile.credit_score),
    credit_score: profile.credit_score,
    no_show_count: profile.no_show_count,
    min_score: MIN_BOOKING_SCORE,
  };
}

export async function checkMemberCanMatch(memberKey: string): Promise<{
  allowed: boolean;
  credit_score: number;
  no_show_count: number;
  min_score: number;
  verification_status: VerificationStatus;
  match_locked_until: string | null;
  block_reason?: string;
}> {
  const profile = await getMemberCredit(memberKey);
  const verification_status = profile.verification_status ?? "none";
  const match_locked_until = profile.match_locked_until ?? null;

  if (!isVerificationApproved(profile)) {
    return {
      allowed: false,
      credit_score: profile.credit_score,
      no_show_count: profile.no_show_count,
      min_score: MIN_MATCH_SCORE,
      verification_status,
      match_locked_until,
      block_reason:
        verification_status === "pending"
          ? "實名認證審核中，通過後即可使用 1V1 匹配。"
          : "請先完成實名認證後再使用 1V1 匹配。",
    };
  }

  if (isMatchFeatureLocked(profile)) {
    return {
      allowed: false,
      credit_score: profile.credit_score,
      no_show_count: profile.no_show_count,
      min_score: MIN_MATCH_SCORE,
      verification_status,
      match_locked_until,
      block_reason: `您曾因 1V1 對局缺席，此功能已暫停至 ${new Date(match_locked_until!).toLocaleDateString("zh-TW")}。`,
    };
  }

  if (!canMatchWithScore(profile.credit_score)) {
    return {
      allowed: false,
      credit_score: profile.credit_score,
      no_show_count: profile.no_show_count,
      min_score: MIN_MATCH_SCORE,
      verification_status,
      match_locked_until,
      block_reason: `信用分不足（${profile.credit_score} / 最低 ${MIN_MATCH_SCORE}），暫時無法使用 1V1 匹配。`,
    };
  }

  return {
    allowed: true,
    credit_score: profile.credit_score,
    no_show_count: profile.no_show_count,
    min_score: MIN_MATCH_SCORE,
    verification_status,
    match_locked_until,
  };
}

export async function applyNoShowPenalty(memberKey: string): Promise<MemberCreditProfile> {
  const manifest = await loadManifest();
  const existing = manifest.profiles[memberKey] ?? defaultProfile(memberKey);
  const profile: MemberCreditProfile = {
    ...existing,
    no_show_count: existing.no_show_count + 1,
    credit_score: Math.max(0, existing.credit_score - NO_SHOW_PENALTY),
    updated_at: new Date().toISOString(),
  };
  manifest.profiles[memberKey] = profile;
  await saveManifest(manifest);
  return profile;
}

/** 1V1 缺席核實：扣信用分並停用匹配 90 日（不影響一般報名門檻邏輯，除非分數低於 40） */
export async function applyMatchNoShowPenalty(memberKey: string): Promise<MemberCreditProfile> {
  const manifest = await loadManifest();
  const existing = manifest.profiles[memberKey] ?? defaultProfile(memberKey);
  const lockUntil = new Date();
  lockUntil.setDate(lockUntil.getDate() + MATCH_NO_SHOW_LOCK_DAYS);

  const profile: MemberCreditProfile = {
    ...existing,
    no_show_count: existing.no_show_count + 1,
    credit_score: Math.max(0, existing.credit_score - NO_SHOW_PENALTY),
    match_locked_until: lockUntil.toISOString(),
    updated_at: new Date().toISOString(),
  };
  manifest.profiles[memberKey] = profile;
  await saveManifest(manifest);
  return profile;
}

export async function listMemberProfiles(): Promise<MemberCreditProfile[]> {
  const manifest = await loadManifest();
  return Object.values(manifest.profiles).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function submitVerificationRequest(
  memberKey: string,
  imageId: string
): Promise<MemberCreditProfile> {
  const manifest = await loadManifest();
  const existing = manifest.profiles[memberKey] ?? defaultProfile(memberKey);
  if (existing.verification_status === "approved") {
    return existing;
  }
  const profile: MemberCreditProfile = {
    ...existing,
    verification_status: "pending",
    verification_image_id: imageId,
    rejection_reason: undefined,
    updated_at: new Date().toISOString(),
  };
  manifest.profiles[memberKey] = profile;
  await saveManifest(manifest);
  return profile;
}

export async function listPendingVerifications(): Promise<MemberCreditProfile[]> {
  const profiles = await listMemberProfiles();
  return profiles.filter((p) => p.verification_status === "pending");
}

export async function reviewVerification(
  memberKey: string,
  action: "approve" | "reject",
  adminLabel: string,
  rejectionReason?: string
): Promise<MemberCreditProfile | null> {
  const manifest = await loadManifest();
  const existing = manifest.profiles[memberKey];
  if (!existing || existing.verification_status !== "pending") {
    return null;
  }

  const profile: MemberCreditProfile = {
    ...existing,
    verification_status: action === "approve" ? "approved" : "rejected",
    verified_at: action === "approve" ? new Date().toISOString() : undefined,
    verified_by_admin: adminLabel.slice(0, 80),
    rejection_reason:
      action === "reject" ? (rejectionReason?.trim().slice(0, 200) || "資料不符") : undefined,
    updated_at: new Date().toISOString(),
  };
  manifest.profiles[memberKey] = profile;
  await saveManifest(manifest);
  return profile;
}
