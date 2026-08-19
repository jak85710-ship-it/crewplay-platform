import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

export type IncidentEventType =
  | "accidental_injury"
  | "malicious_foul"
  | "verbal_conflict"
  | "equipment_damage"
  | "other";

export type IncidentStage = "warmup" | "in_match" | "break" | "post_match";

export type IncidentAction =
  | "ambulance"
  | "onsite_settlement"
  | "police"
  | "monitoring_only";

export type HostIncidentRecord = {
  id: string;
  ticket_no?: string;
  team_id: string;
  booking_id: string;
  booking_reference: string;
  event_type: IncidentEventType;
  stage: IncidentStage;
  action_taken: IncidentAction;
  summary: string;
  reported_by_member_key: string;
  reported_by_email: string;
  reported_by_phone: string;
  created_at: string;
};

type IncidentManifest = {
  incidents: HostIncidentRecord[];
};

const BLOB_STORE = "crewplay-host-incidents";
const BLOB_KEY = "manifest";
const LOCAL_FILE = path.join(process.cwd(), ".data", "host-incidents.json");

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): IncidentManifest {
  return { incidents: [] };
}

function readLocalManifest(): IncidentManifest {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return emptyManifest();
    const parsed = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as IncidentManifest;
    if (!parsed || !Array.isArray(parsed.incidents)) return emptyManifest();
    return parsed;
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: IncidentManifest) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<IncidentManifest> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (data && typeof data === "object" && "incidents" in data) {
    const parsed = data as IncidentManifest;
    if (Array.isArray(parsed.incidents)) return parsed;
  }
  return readLocalManifest();
}

async function writeBlobManifest(manifest: IncidentManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<IncidentManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: IncidentManifest): Promise<void> {
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

function buildIncidentTicket(id: string, createdAt: string): string {
  const baseDate = Number.isNaN(new Date(createdAt).getTime()) ? new Date() : new Date(createdAt);
  const y = String(baseDate.getFullYear());
  const m = String(baseDate.getMonth() + 1).padStart(2, "0");
  const d = String(baseDate.getDate()).padStart(2, "0");
  const suffix = String(id || "").replace(/-/g, "").slice(0, 6).toUpperCase() || "UNKNOWN";
  return `INC-${y}${m}${d}-${suffix}`;
}

export async function listHostIncidentReports(teamIds?: string[]): Promise<HostIncidentRecord[]> {
  const manifest = await loadManifest();
  const idSet = new Set((teamIds || []).map((id) => String(id || "").trim()).filter(Boolean));
  const list = idSet.size
    ? manifest.incidents.filter((row) => idSet.has(row.team_id))
    : manifest.incidents;
  return [...list]
    .map((row) =>
      row.ticket_no
        ? row
        : {
            ...row,
            ticket_no: buildIncidentTicket(row.id, row.created_at),
          }
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function saveHostIncidentReport(
  input: Omit<HostIncidentRecord, "id" | "created_at">
): Promise<HostIncidentRecord> {
  const manifest = await loadManifest();
  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const record: HostIncidentRecord = {
    ...input,
    id,
    created_at: createdAt,
    ticket_no: buildIncidentTicket(id, createdAt),
  };
  manifest.incidents.push(record);
  manifest.incidents = manifest.incidents.slice(-50000);
  await saveManifest(manifest);
  return record;
}

export async function getHostIncidentById(incidentId: string): Promise<HostIncidentRecord | null> {
  const id = String(incidentId || "").trim();
  if (!id) return null;
  const manifest = await loadManifest();
  const row = manifest.incidents.find((item) => item.id === id) ?? null;
  if (!row) return null;
  if (row.ticket_no) return row;
  return {
    ...row,
    ticket_no: buildIncidentTicket(row.id, row.created_at),
  };
}

