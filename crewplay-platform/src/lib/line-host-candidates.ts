import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

export type LineHostCandidate = {
  userId: string;
  sourceType: "user" | "group" | "room" | "unknown";
  displayName?: string;
  lastMessage?: string;
  lastEventType?: string;
  lastEventAt: string;
  updatedAt: string;
};

type CandidateManifest = {
  items: LineHostCandidate[];
  updatedAt: string;
};

const BLOB_STORE = "crewplay-line-notify";
const BLOB_KEY = "host-candidates";
const LOCAL_FILE = path.join(process.cwd(), ".data", "line-host-candidates.json");
const MAX_ITEMS = 300;

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): CandidateManifest {
  return { items: [], updatedAt: new Date().toISOString() };
}

function normalizeSourceType(value: unknown): LineHostCandidate["sourceType"] {
  const source = String(value || "").trim();
  if (source === "user" || source === "group" || source === "room") return source;
  return "unknown";
}

function normalizeCandidate(raw: unknown): LineHostCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Partial<LineHostCandidate>;
  const userId = String(input.userId || "").trim();
  if (!userId) return null;
  return {
    userId,
    sourceType: normalizeSourceType(input.sourceType),
    displayName: input.displayName ? String(input.displayName).trim() : undefined,
    lastMessage: input.lastMessage ? String(input.lastMessage).trim().slice(0, 120) : undefined,
    lastEventType: input.lastEventType ? String(input.lastEventType).trim() : undefined,
    lastEventAt: String(input.lastEventAt || new Date().toISOString()),
    updatedAt: String(input.updatedAt || new Date().toISOString()),
  };
}

function normalizeManifest(raw: unknown): CandidateManifest {
  if (!raw || typeof raw !== "object") return emptyManifest();
  const input = raw as Partial<CandidateManifest>;
  const itemsRaw = Array.isArray(input.items) ? input.items : [];
  const items = itemsRaw
    .map((row) => normalizeCandidate(row))
    .filter((row): row is LineHostCandidate => Boolean(row))
    .sort((a, b) => Date.parse(b.lastEventAt) - Date.parse(a.lastEventAt))
    .slice(0, MAX_ITEMS);
  return {
    items,
    updatedAt: String(input.updatedAt || new Date().toISOString()),
  };
}

function readLocalManifest(): CandidateManifest {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return emptyManifest();
    const raw = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8"));
    return normalizeManifest(raw);
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: CandidateManifest) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<CandidateManifest> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (!data) return readLocalManifest();
  return normalizeManifest(data);
}

async function writeBlobManifest(manifest: CandidateManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<CandidateManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: CandidateManifest): Promise<void> {
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

export async function listLineHostCandidates(): Promise<LineHostCandidate[]> {
  const manifest = await loadManifest();
  return manifest.items;
}

export async function upsertLineHostCandidate(input: {
  userId: string;
  sourceType?: string;
  displayName?: string;
  lastMessage?: string;
  lastEventType?: string;
  occurredAt?: string;
}): Promise<LineHostCandidate | null> {
  const userId = String(input.userId || "").trim();
  if (!userId) return null;
  const now = new Date().toISOString();
  const occurredAt = String(input.occurredAt || now);
  const sourceType = normalizeSourceType(input.sourceType);
  const displayName = input.displayName ? String(input.displayName).trim() : undefined;
  const lastMessage = input.lastMessage ? String(input.lastMessage).trim().slice(0, 120) : undefined;
  const lastEventType = input.lastEventType ? String(input.lastEventType).trim() : undefined;

  const manifest = await loadManifest();
  const idx = manifest.items.findIndex((item) => item.userId === userId);
  const existing = idx >= 0 ? manifest.items[idx] : null;
  const next: LineHostCandidate = {
    userId,
    sourceType,
    displayName: displayName || existing?.displayName,
    lastMessage: lastMessage || existing?.lastMessage,
    lastEventType: lastEventType || existing?.lastEventType,
    lastEventAt: occurredAt,
    updatedAt: now,
  };

  if (idx >= 0) manifest.items[idx] = next;
  else manifest.items.push(next);

  manifest.items = manifest.items
    .sort((a, b) => Date.parse(b.lastEventAt) - Date.parse(a.lastEventAt))
    .slice(0, MAX_ITEMS);
  manifest.updatedAt = now;
  await saveManifest(manifest);
  return next;
}
