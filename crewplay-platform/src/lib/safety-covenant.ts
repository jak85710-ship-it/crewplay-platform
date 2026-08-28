import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";
export {
  SAFETY_COVENANT_ITEMS,
  SAFETY_COVENANT_VERSION,
  type SafetyCovenantKey,
} from "@/lib/safety-covenant-meta";

export type SafetyCovenantRecord = {
  booking_id: string;
  team_id: string;
  member_key: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  policy_version: string;
  accepted_at: string;
  risk_ack: boolean;
  etiquette_ack: boolean;
  mediation_ack: boolean;
};

type CovenantManifest = {
  records: SafetyCovenantRecord[];
};

const BLOB_STORE = "crewplay-safety-covenant";
const BLOB_KEY = "records";
const LOCAL_FILE = path.join(process.cwd(), ".data", "safety-covenant-records.json");

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): CovenantManifest {
  return { records: [] };
}

function readLocalManifest(): CovenantManifest {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return emptyManifest();
    const parsed = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as CovenantManifest;
    if (!parsed || !Array.isArray(parsed.records)) return emptyManifest();
    return parsed;
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: CovenantManifest) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<CovenantManifest> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (data && typeof data === "object" && "records" in data) {
    const parsed = data as CovenantManifest;
    if (Array.isArray(parsed.records)) return parsed;
  }
  return readLocalManifest();
}

async function writeBlobManifest(manifest: CovenantManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<CovenantManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: CovenantManifest): Promise<void> {
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

export async function saveSafetyCovenantRecord(record: SafetyCovenantRecord): Promise<void> {
  const manifest = await loadManifest();
  const filtered = manifest.records.filter((r) => r.booking_id !== record.booking_id);
  filtered.push(record);
  manifest.records = filtered.slice(-20000);
  await saveManifest(manifest);
}

export async function getSafetyCovenantMapByBookingIds(
  bookingIds: string[]
): Promise<Record<string, SafetyCovenantRecord>> {
  const ids = new Set(bookingIds.map((id) => String(id || "").trim()).filter(Boolean));
  if (!ids.size) return {};
  const manifest = await loadManifest();
  const out: Record<string, SafetyCovenantRecord> = {};
  for (const row of manifest.records) {
    if (!ids.has(row.booking_id)) continue;
    out[row.booking_id] = row;
  }
  return out;
}

export async function getSafetyCovenantByBookingId(
  bookingId: string
): Promise<SafetyCovenantRecord | null> {
  const id = String(bookingId || "").trim();
  if (!id) return null;
  const manifest = await loadManifest();
  return manifest.records.find((row) => row.booking_id === id) ?? null;
}

