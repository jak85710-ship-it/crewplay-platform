import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

type TeamCapacityManifest = {
  teamCapacityById: Record<string, number>;
  updatedAt: string;
};

const BLOB_STORE = "crewplay-team-config";
const BLOB_KEY = "team-capacity-overrides";
const LOCAL_FILE = path.join(process.cwd(), ".data", "team-capacity-overrides.json");

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): TeamCapacityManifest {
  return { teamCapacityById: {}, updatedAt: new Date().toISOString() };
}

function readLocalManifest(): TeamCapacityManifest {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return emptyManifest();
    const parsed = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as TeamCapacityManifest;
    if (!parsed || typeof parsed !== "object") return emptyManifest();
    return {
      teamCapacityById: parsed.teamCapacityById ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: TeamCapacityManifest) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<TeamCapacityManifest> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (data && typeof data === "object" && "teamCapacityById" in data) {
    const parsed = data as TeamCapacityManifest;
    return {
      teamCapacityById: parsed.teamCapacityById ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  }
  return readLocalManifest();
}

async function writeBlobManifest(manifest: TeamCapacityManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<TeamCapacityManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: TeamCapacityManifest): Promise<void> {
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

export async function listTeamCapacityOverrides(): Promise<Record<string, number>> {
  const manifest = await loadManifest();
  return manifest.teamCapacityById ?? {};
}

export async function setTeamCapacityOverride(teamId: string, capacity: number | null): Promise<void> {
  const key = String(teamId || "").trim();
  if (!key) throw new Error("team_id_required");
  const manifest = await loadManifest();

  if (capacity == null) {
    delete manifest.teamCapacityById[key];
  } else {
    manifest.teamCapacityById[key] = capacity;
  }

  manifest.updatedAt = new Date().toISOString();
  await saveManifest(manifest);
}
