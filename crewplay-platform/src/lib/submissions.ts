import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";
import type { HostSubmission, VenueSubmission } from "@/lib/email";

export type SubmissionKind = "host" | "venue";
export type SubmissionPaymentStatus = "pending_payment" | "paid";
export type HostSubmissionRecord = StoredHost;
export type VenueSubmissionRecord = StoredVenue;

type StoredHost = HostSubmission & {
  merchant_trade_no: string;
  payment_status: SubmissionPaymentStatus;
  platform_fee: number;
};

type StoredVenue = VenueSubmission & {
  merchant_trade_no: string;
  payment_status: SubmissionPaymentStatus;
  platform_fee: number;
};

type SubmissionsManifest = {
  host: StoredHost[];
  venue: StoredVenue[];
};

const BLOB_STORE = "crewplay-submissions";
const BLOB_MANIFEST_KEY = "manifest";

function dataDir() {
  return path.join(process.cwd(), "public/data/submissions");
}

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): SubmissionsManifest {
  return { host: [], venue: [] };
}

function readLocalManifest(): SubmissionsManifest {
  const manifest = emptyManifest();
  for (const kind of ["host", "venue"] as const) {
    try {
      const file = path.join(dataDir(), `${kind}.json`);
      if (!fs.existsSync(file)) continue;
      const rows = JSON.parse(fs.readFileSync(file, "utf8")) as unknown[];
      manifest[kind] = rows as StoredHost[] & StoredVenue[];
    } catch {
      /* ignore */
    }
  }
  return manifest;
}

function writeLocalManifest(manifest: SubmissionsManifest) {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(path.join(dataDir(), "host.json"), JSON.stringify(manifest.host, null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir(), "venue.json"), JSON.stringify(manifest.venue, null, 2), "utf8");
}

async function loadManifest(): Promise<SubmissionsManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_MANIFEST_KEY, { type: "json" });
  if (data && typeof data === "object" && "host" in data && "venue" in data) {
    return data as SubmissionsManifest;
  }
  return readLocalManifest();
}

async function saveManifest(manifest: SubmissionsManifest): Promise<void> {
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_MANIFEST_KEY, manifest);
}

export function createTradeNo(prefix: "CH" | "CV"): string {
  const t = Date.now().toString(36).toUpperCase();
  return `${prefix}${t}`.slice(0, 20);
}

export async function saveHostSubmission(
  record: Omit<HostSubmission, "merchant_trade_no" | "payment_status" | "platform_fee">,
  merchantTradeNo: string,
  platformFee: number
): Promise<StoredHost> {
  const stored: StoredHost = {
    ...record,
    merchant_trade_no: merchantTradeNo,
    payment_status: platformFee > 0 ? "pending_payment" : "paid",
    platform_fee: platformFee,
  };
  const manifest = await loadManifest();
  manifest.host.push(stored);
  await saveManifest(manifest);
  return stored;
}

export async function saveVenueSubmission(
  record: Omit<VenueSubmission, "merchant_trade_no" | "payment_status" | "platform_fee">,
  merchantTradeNo: string,
  platformFee: number
): Promise<StoredVenue> {
  const stored: StoredVenue = {
    ...record,
    merchant_trade_no: merchantTradeNo,
    payment_status: platformFee > 0 ? "pending_payment" : "paid",
    platform_fee: platformFee,
  };
  const manifest = await loadManifest();
  manifest.venue.push(stored);
  await saveManifest(manifest);
  return stored;
}

export async function getHostByTradeNo(tradeNo: string): Promise<StoredHost | null> {
  const manifest = await loadManifest();
  return manifest.host.find((r) => r.merchant_trade_no === tradeNo) ?? null;
}

export async function getVenueByTradeNo(tradeNo: string): Promise<StoredVenue | null> {
  const manifest = await loadManifest();
  return manifest.venue.find((r) => r.merchant_trade_no === tradeNo) ?? null;
}

export async function markHostPaid(tradeNo: string): Promise<StoredHost | null> {
  const manifest = await loadManifest();
  const idx = manifest.host.findIndex((r) => r.merchant_trade_no === tradeNo);
  if (idx < 0) return null;
  manifest.host[idx] = { ...manifest.host[idx], payment_status: "paid" };
  await saveManifest(manifest);
  return manifest.host[idx];
}

export async function markVenuePaid(tradeNo: string): Promise<StoredVenue | null> {
  const manifest = await loadManifest();
  const idx = manifest.venue.findIndex((r) => r.merchant_trade_no === tradeNo);
  if (idx < 0) return null;
  manifest.venue[idx] = { ...manifest.venue[idx], payment_status: "paid" };
  await saveManifest(manifest);
  return manifest.venue[idx];
}

export async function listHostSubmissions(): Promise<StoredHost[]> {
  const manifest = await loadManifest();
  return [...manifest.host].sort(
    (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );
}
