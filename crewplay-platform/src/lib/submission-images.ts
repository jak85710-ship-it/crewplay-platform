import fs from "fs";
import path from "path";

import { getStore } from "@netlify/blobs";

import { getPublicSiteUrl } from "@/lib/line-auth";

const BLOB_STORE = "crewplay-submission-images";
const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type SubmissionImageKind = "host" | "venue";

function imagesDir() {
  return path.join(process.cwd(), "public/data/submission-images");
}

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function localMetaPath(id: string) {
  return path.join(imagesDir(), `${id}.meta.json`);
}

function localDataPath(id: string, contentType: string) {
  const ext = EXT_BY_TYPE[contentType] || "bin";
  return path.join(imagesDir(), `${id}.${ext}`);
}

function resolveLocalDataPath(id: string): { filePath: string; contentType: string } | null {
  const metaFile = localMetaPath(id);
  if (!fs.existsSync(metaFile)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile, "utf8")) as { contentType?: string };
    const contentType = meta.contentType || "image/jpeg";
    const filePath = localDataPath(id, contentType);
    if (!fs.existsSync(filePath)) return null;
    return { filePath, contentType };
  } catch {
    return null;
  }
}

export function validateSubmissionImageFile(file: File | Blob, contentType: string): string | null {
  if (!ALLOWED_TYPES.has(contentType)) {
    return "僅支援 JPG、PNG、WebP 格式";
  }
  if (file.size > MAX_BYTES) {
    return "圖片大小請在 4MB 以內";
  }
  if (file.size === 0) {
    return "請選擇有效的圖片檔案";
  }
  return null;
}

export function submissionImagePublicUrl(imageId: string): string {
  return `${getPublicSiteUrl()}/api/submissions/image/${encodeURIComponent(imageId)}`;
}

export async function saveSubmissionImage(
  bytes: Buffer,
  contentType: string,
  kind: SubmissionImageKind
): Promise<{ id: string; url: string }> {
  const id = `${kind}-${crypto.randomUUID()}`;

  if (useLocalFileStorage()) {
    fs.mkdirSync(imagesDir(), { recursive: true });
    fs.writeFileSync(localDataPath(id, contentType), bytes);
    fs.writeFileSync(localMetaPath(id), JSON.stringify({ contentType }), "utf8");
  } else {
    const store = getStore(BLOB_STORE);
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    await store.set(id, arrayBuffer, { metadata: { contentType } });
  }

  return { id, url: submissionImagePublicUrl(id) };
}

export async function hasSubmissionImage(id: string): Promise<boolean> {
  if (!id || !/^(host|venue)-[0-9a-f-]{36}$/i.test(id)) return false;

  if (useLocalFileStorage()) {
    return resolveLocalDataPath(id) !== null;
  }

  const store = getStore(BLOB_STORE);
  return (await store.getMetadata(id)) !== null;
}

export async function getSubmissionImage(
  id: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!id || !/^(host|venue)-[0-9a-f-]{36}$/i.test(id)) return null;

  if (useLocalFileStorage()) {
    const resolved = resolveLocalDataPath(id);
    if (!resolved) return null;
    return {
      bytes: fs.readFileSync(resolved.filePath),
      contentType: resolved.contentType,
    };
  }

  const store = getStore(BLOB_STORE);
  const meta = await store.getMetadata(id);
  if (!meta) return null;

  const data = await store.get(id, { type: "arrayBuffer" });
  if (!data) return null;

  const contentType =
    typeof meta.metadata?.contentType === "string" ? meta.metadata.contentType : "image/jpeg";

  return { bytes: Buffer.from(data), contentType };
}
