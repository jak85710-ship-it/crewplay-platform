import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

type TeamManualMembersManifest = {
  teamManualMembersById: Record<string, number>;
  updatedAt: string;
};

const BLOB_STORE = "crewplay-team-config";
const BLOB_KEY = "team-manual-members";
const LOCAL_FILE = path.join(process.cwd(), ".data", "team-manual-members.json");

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): TeamManualMembersManifest {
  return { teamManualMembersById: {}, updatedAt: new Date().toISOString() };
}

function readLocalManifest(): TeamManualMembersManifest {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return emptyManifest();
    const parsed = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as TeamManualMembersManifest;
    if (!parsed || typeof parsed !== "object") return emptyManifest();
    return {
      teamManualMembersById: parsed.teamManualMembersById ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: TeamManualMembersManifest) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<TeamManualMembersManifest> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (data && typeof data === "object" && "teamManualMembersById" in data) {
    const parsed = data as TeamManualMembersManifest;
    return {
      teamManualMembersById: parsed.teamManualMembersById ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  }
  return readLocalManifest();
}

async function writeBlobManifest(manifest: TeamManualMembersManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<TeamManualMembersManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: TeamManualMembersManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

export async function listTeamManualMembers(): Promise<Record<string, number>> {
  const manifest = await loadManifest();
  return manifest.teamManualMembersById ?? {};
}

export async function setTeamManualMembers(teamId: string, count: number): Promise<number> {
  const key = String(teamId || "").trim();
  if (!key) throw new Error("team_id_required");
  const normalized = Math.max(0, Math.floor(Number(count) || 0));
  const manifest = await loadManifest();
  manifest.teamManualMembersById[key] = normalized;
  await saveManifest(manifest);
  return normalized;
}

export async function addTeamManualMembers(teamId: string, delta: number): Promise<number> {
  const key = String(teamId || "").trim();
  if (!key) throw new Error("team_id_required");
  const manifest = await loadManifest();
  const current = Math.max(0, Math.floor(Number(manifest.teamManualMembersById[key] || 0)));
  const next = Math.max(0, current + Math.floor(Number(delta) || 0));
  manifest.teamManualMembersById[key] = next;
  await saveManifest(manifest);
  return next;
}
