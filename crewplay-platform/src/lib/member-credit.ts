import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

import {
  DEFAULT_CREDIT_SCORE,
  MIN_BOOKING_SCORE,
  NO_SHOW_PENALTY,
} from "@/lib/member-credit-constants";

export { DEFAULT_CREDIT_SCORE, MIN_BOOKING_SCORE, NO_SHOW_PENALTY };

export type MemberCreditProfile = {
  member_key: string;
  credit_score: number;
  no_show_count: number;
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
    updated_at: new Date().toISOString(),
  };
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

export async function listMemberProfiles(): Promise<MemberCreditProfile[]> {
  const manifest = await loadManifest();
  return Object.values(manifest.profiles).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}
