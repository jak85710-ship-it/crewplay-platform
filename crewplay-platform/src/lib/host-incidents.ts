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
  status?: "open" | "closed";
  closed_at?: string;
  close_note?: string;
  timeline?: IncidentTimelineEvent[];
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

export type IncidentTimelineEvent = {
  at: string;
  type: "reported" | "mail_resent" | "closed" | "reopened";
  note?: string;
  actor?: string;
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

function normalizeIncidentRecord(row: HostIncidentRecord): HostIncidentRecord {
  const status = row.status === "closed" ? "closed" : "open";
  const timeline = normalizeTimeline(row);
  return {
    ...row,
    ticket_no: row.ticket_no || buildIncidentTicket(row.id, row.created_at),
    status,
    closed_at: status === "closed" ? row.closed_at || row.created_at : "",
    close_note: row.close_note || "",
    timeline,
  };
}

function normalizeTimeline(row: HostIncidentRecord): IncidentTimelineEvent[] {
  const list = Array.isArray(row.timeline) ? row.timeline.filter(Boolean) : [];
  const hasReported = list.some((event) => event.type === "reported");
  const base: IncidentTimelineEvent[] = hasReported
    ? list
    : [{ at: row.created_at, type: "reported", note: "建立事故通報" }];
  const hasClosed = base.some((event) => event.type === "closed");
  if (row.status === "closed" && row.closed_at && !hasClosed) {
    base.push({
      at: row.closed_at,
      type: "closed",
      note: row.close_note || "已結案",
    });
  }
  return base
    .map((event) => ({
      at: event.at || row.created_at,
      type: event.type,
      note: event.note || "",
      actor: event.actor || "",
    }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export async function listHostIncidentReports(teamIds?: string[]): Promise<HostIncidentRecord[]> {
  const manifest = await loadManifest();
  const idSet = new Set((teamIds || []).map((id) => String(id || "").trim()).filter(Boolean));
  const list = idSet.size
    ? manifest.incidents.filter((row) => idSet.has(row.team_id))
    : manifest.incidents;
  return [...list]
    .map((row) => normalizeIncidentRecord(row))
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
    status: "open",
    closed_at: "",
    close_note: "",
    timeline: [{ at: createdAt, type: "reported", note: "建立事故通報" }],
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
  return normalizeIncidentRecord(row);
}

export async function setHostIncidentStatus(input: {
  incidentId: string;
  status: "open" | "closed";
  closeNote?: string;
}): Promise<HostIncidentRecord | null> {
  const incidentId = String(input.incidentId || "").trim();
  if (!incidentId) return null;
  const status = input.status === "closed" ? "closed" : "open";
  const note = String(input.closeNote || "").replace(/\s+/g, " ").trim().slice(0, 300);

  const manifest = await loadManifest();
  const idx = manifest.incidents.findIndex((row) => row.id === incidentId);
  if (idx < 0) return null;
  const row = normalizeIncidentRecord(manifest.incidents[idx]);
  const timeline = [...(row.timeline || [])];
  const nowIso = new Date().toISOString();
  timeline.push({
    at: nowIso,
    type: status === "closed" ? "closed" : "reopened",
    note: status === "closed" ? note || "已結案" : note || "案件重新開啟",
  });

  const next: HostIncidentRecord = {
    ...row,
    status,
    closed_at: status === "closed" ? nowIso : "",
    close_note: status === "closed" ? note : "",
    timeline,
  };
  manifest.incidents[idx] = next;
  await saveManifest(manifest);
  return normalizeIncidentRecord(next);
}

export async function appendHostIncidentTimelineEvent(input: {
  incidentId: string;
  type: IncidentTimelineEvent["type"];
  note?: string;
  actor?: string;
}): Promise<HostIncidentRecord | null> {
  const incidentId = String(input.incidentId || "").trim();
  if (!incidentId) return null;
  const manifest = await loadManifest();
  const idx = manifest.incidents.findIndex((row) => row.id === incidentId);
  if (idx < 0) return null;
  const row = normalizeIncidentRecord(manifest.incidents[idx]);
  const timeline = [...(row.timeline || [])];
  timeline.push({
    at: new Date().toISOString(),
    type: input.type,
    note: String(input.note || "").trim().slice(0, 300),
    actor: String(input.actor || "").trim().slice(0, 120),
  });
  const next: HostIncidentRecord = {
    ...row,
    timeline,
  };
  manifest.incidents[idx] = next;
  await saveManifest(manifest);
  return normalizeIncidentRecord(next);
}

