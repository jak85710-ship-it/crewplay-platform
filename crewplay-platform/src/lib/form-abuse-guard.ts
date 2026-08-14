import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

type LimitEntry = {
  count: number;
  windowStart: number;
  lastAt: number;
  blockedUntil?: number;
};

type FingerprintEntry = {
  value: string;
  ip: string;
  ts: number;
};

type GuardManifest = {
  hostSubmitByIp: Record<string, LimitEntry>;
  imageUploadByIp: Record<string, LimitEntry>;
  recentHostFingerprints: FingerprintEntry[];
};

const BLOB_STORE = "crewplay-abuse-guard";
const BLOB_KEY = "form-guard";
const LOCAL_FILE = path.join(process.cwd(), ".data", "form-guard.json");

const HOST_SUBMIT_WINDOW_MS = 10 * 60 * 1000;
const HOST_SUBMIT_LIMIT = 5;
const HOST_SUBMIT_BLOCK_MS = 30 * 60 * 1000;
const HOST_DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

const IMAGE_UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const IMAGE_UPLOAD_LIMIT = 12;
const IMAGE_UPLOAD_BLOCK_MS = 20 * 60 * 1000;

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): GuardManifest {
  return {
    hostSubmitByIp: {},
    imageUploadByIp: {},
    recentHostFingerprints: [],
  };
}

function ensureLocalFile() {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  if (!fs.existsSync(LOCAL_FILE)) {
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(emptyManifest(), null, 2), "utf8");
  }
}

function readLocalManifest(): GuardManifest {
  try {
    ensureLocalFile();
    const parsed = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as GuardManifest;
    return {
      hostSubmitByIp: parsed.hostSubmitByIp || {},
      imageUploadByIp: parsed.imageUploadByIp || {},
      recentHostFingerprints: Array.isArray(parsed.recentHostFingerprints)
        ? parsed.recentHostFingerprints
        : [],
    };
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: GuardManifest) {
  ensureLocalFile();
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<GuardManifest> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (data && typeof data === "object") {
    const parsed = data as Partial<GuardManifest>;
    return {
      hostSubmitByIp: parsed.hostSubmitByIp || {},
      imageUploadByIp: parsed.imageUploadByIp || {},
      recentHostFingerprints: Array.isArray(parsed.recentHostFingerprints)
        ? parsed.recentHostFingerprints
        : [],
    };
  }
  return readLocalManifest();
}

async function writeBlobManifest(manifest: GuardManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<GuardManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: GuardManifest): Promise<void> {
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

function extractClientIp(req: Request): string {
  const fromXff = req.headers.get("x-forwarded-for");
  if (fromXff) {
    const first = fromXff.split(",")[0]?.trim();
    if (first) return first;
  }
  const candidates = [
    req.headers.get("x-nf-client-connection-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-client-ip"),
  ];
  for (const value of candidates) {
    const cleaned = String(value || "").trim();
    if (cleaned) return cleaned;
  }
  return "unknown";
}

function applyWindowLimit(
  entry: LimitEntry | undefined,
  now: number,
  windowMs: number,
  limit: number,
  blockMs: number
): { ok: boolean; retrySec?: number; next: LimitEntry } {
  const base: LimitEntry = entry
    ? { ...entry }
    : { count: 0, windowStart: now, lastAt: now };

  if (base.blockedUntil && base.blockedUntil > now) {
    return {
      ok: false,
      retrySec: Math.ceil((base.blockedUntil - now) / 1000),
      next: base,
    };
  }

  if (!base.windowStart || now - base.windowStart >= windowMs) {
    base.windowStart = now;
    base.count = 0;
  }

  base.count += 1;
  base.lastAt = now;
  if (base.count > limit) {
    base.blockedUntil = now + blockMs;
    return {
      ok: false,
      retrySec: Math.ceil(blockMs / 1000),
      next: base,
    };
  }

  return { ok: true, next: base };
}

function pruneManifest(manifest: GuardManifest, now: number): GuardManifest {
  const maxWindow = Math.max(HOST_SUBMIT_WINDOW_MS, IMAGE_UPLOAD_WINDOW_MS) + HOST_SUBMIT_BLOCK_MS;

  const cleanByIp = (table: Record<string, LimitEntry>) =>
    Object.fromEntries(
      Object.entries(table).filter(([, entry]) => {
        const alive = now - (entry.lastAt || 0) <= maxWindow;
        const blocked = Boolean(entry.blockedUntil && entry.blockedUntil > now);
        return alive || blocked;
      })
    );

  return {
    hostSubmitByIp: cleanByIp(manifest.hostSubmitByIp || {}),
    imageUploadByIp: cleanByIp(manifest.imageUploadByIp || {}),
    recentHostFingerprints: (manifest.recentHostFingerprints || []).filter(
      (row) => now - row.ts <= HOST_DUPLICATE_WINDOW_MS
    ),
  };
}

export async function checkAndRecordHostSubmitGuard(input: {
  req: Request;
  fingerprint: string;
  honeypot: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (String(input.honeypot || "").trim()) {
    return { ok: false, status: 400, error: "提交失敗，請重新整理後再試" };
  }

  const now = Date.now();
  const ip = extractClientIp(input.req);
  const manifest = pruneManifest(await loadManifest(), now);

  const duplicate = manifest.recentHostFingerprints.find(
    (row) => row.ip === ip && row.value === input.fingerprint && now - row.ts <= HOST_DUPLICATE_WINDOW_MS
  );
  if (duplicate) {
    return { ok: false, status: 429, error: "偵測到重複提交，請稍後再試" };
  }

  const limited = applyWindowLimit(
    manifest.hostSubmitByIp[ip],
    now,
    HOST_SUBMIT_WINDOW_MS,
    HOST_SUBMIT_LIMIT,
    HOST_SUBMIT_BLOCK_MS
  );
  manifest.hostSubmitByIp[ip] = limited.next;

  if (!limited.ok) {
    await saveManifest(manifest);
    return {
      ok: false,
      status: 429,
      error: `提交過於頻繁，請 ${limited.retrySec ?? 60} 秒後再試`,
    };
  }

  manifest.recentHostFingerprints.push({ value: input.fingerprint, ip, ts: now });
  await saveManifest(manifest);
  return { ok: true };
}

export async function checkAndRecordImageUploadGuard(input: {
  req: Request;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const now = Date.now();
  const ip = extractClientIp(input.req);
  const manifest = pruneManifest(await loadManifest(), now);

  const limited = applyWindowLimit(
    manifest.imageUploadByIp[ip],
    now,
    IMAGE_UPLOAD_WINDOW_MS,
    IMAGE_UPLOAD_LIMIT,
    IMAGE_UPLOAD_BLOCK_MS
  );
  manifest.imageUploadByIp[ip] = limited.next;
  await saveManifest(manifest);

  if (!limited.ok) {
    return {
      ok: false,
      status: 429,
      error: `圖片上傳過於頻繁，請 ${limited.retrySec ?? 60} 秒後再試`,
    };
  }
  return { ok: true };
}
