import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

export type VenueDeviceConsultingSubmission = {
  id: string;
  submitted_at: string;
  venue_name: string;
  venue_address: string;
  contact_name_title: string;
  contact_phone: string;
  contact_email: string;
  sports: string[];
  devices: string[];
  network_ready: "是" | "否";
  goals: string[];
  pain_points: string[];
  consult_methods: string[];
  preferred_slots: string[];
};

type ConsultingManifest = {
  items: VenueDeviceConsultingSubmission[];
};

const BLOB_STORE = "crewplay-submissions";
const BLOB_KEY = "venue-device-consulting";

function localFilePath(): string {
  return path.join(process.cwd(), "public", "data", "submissions", "venue-device-consulting.json");
}

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): ConsultingManifest {
  return { items: [] };
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v || "").trim()).filter(Boolean))];
}

function normalizeSubmission(value: unknown): VenueDeviceConsultingSubmission | null {
  if (!value || typeof value !== "object") return null;
  const src = value as Partial<VenueDeviceConsultingSubmission>;
  const networkRaw = String(src.network_ready || "").trim();
  const networkReady: "是" | "否" = networkRaw === "否" ? "否" : "是";
  return {
    id: String(src.id || "").trim(),
    submitted_at: String(src.submitted_at || new Date().toISOString()),
    venue_name: String(src.venue_name || "").trim(),
    venue_address: String(src.venue_address || "").trim(),
    contact_name_title: String(src.contact_name_title || "").trim(),
    contact_phone: String(src.contact_phone || "").trim(),
    contact_email: String(src.contact_email || "").trim(),
    sports: normalizeList(src.sports),
    devices: normalizeList(src.devices),
    network_ready: networkReady,
    goals: normalizeList(src.goals),
    pain_points: normalizeList(src.pain_points),
    consult_methods: normalizeList(src.consult_methods),
    preferred_slots: normalizeList(src.preferred_slots),
  };
}

function normalizeManifest(value: unknown): ConsultingManifest {
  if (!value || typeof value !== "object") return emptyManifest();
  const src = value as { items?: unknown[] };
  if (!Array.isArray(src.items)) return emptyManifest();
  return {
    items: src.items
      .map((item) => normalizeSubmission(item))
      .filter((item): item is VenueDeviceConsultingSubmission => Boolean(item?.id)),
  };
}

function readLocalManifest(): ConsultingManifest {
  try {
    const file = localFilePath();
    if (!fs.existsSync(file)) return emptyManifest();
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return normalizeManifest(raw);
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: ConsultingManifest): void {
  const file = localFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<ConsultingManifest> {
  const store = getStore(BLOB_STORE);
  const raw = await store.get(BLOB_KEY, { type: "json" });
  if (!raw) return readLocalManifest();
  return normalizeManifest(raw);
}

async function writeBlobManifest(manifest: ConsultingManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<ConsultingManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: ConsultingManifest): Promise<void> {
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

export async function saveVenueDeviceConsultingSubmission(
  submission: VenueDeviceConsultingSubmission
): Promise<void> {
  const manifest = await loadManifest();
  manifest.items.push(submission);
  await saveManifest(manifest);
}
