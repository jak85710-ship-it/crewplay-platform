import fs from "fs";
import path from "path";

import { getStore } from "@netlify/blobs";

const BLOB_STORE = "crewplay-verification-images";
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function imagesDir() {
  return path.join(process.cwd(), ".data", "verification-images");
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

export function validateVerificationImageFile(file: File | Blob, contentType: string): string | null {
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

export function validateVerificationImageContent(bytes: Buffer, contentType: string): string | null {
  if (bytes.length < 12) {
    return "圖片檔案格式無效，請重新上傳";
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (contentType === "image/jpeg" && !isJpeg) return "檔案與副檔名不符，請重新上傳 JPG";
  if (contentType === "image/png" && !isPng) return "檔案與副檔名不符，請重新上傳 PNG";
  if (contentType === "image/webp" && !isWebp) return "檔案與副檔名不符，請重新上傳 WebP";
  if (!isJpeg && !isPng && !isWebp) return "僅支援有效的 JPG、PNG、WebP 圖片";

  return null;
}

export function isVerificationImageId(id: string): boolean {
  return /^verify-[0-9a-f-]{36}$/i.test(id);
}

export async function saveVerificationImage(
  bytes: Buffer,
  contentType: string
): Promise<{ id: string }> {
  const id = `verify-${crypto.randomUUID()}`;

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

  return { id };
}

export async function getVerificationImage(
  id: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!isVerificationImageId(id)) return null;

  if (useLocalFileStorage()) {
    const metaFile = localMetaPath(id);
    if (!fs.existsSync(metaFile)) return null;
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf8")) as { contentType?: string };
      const contentType = meta.contentType || "image/jpeg";
      const filePath = localDataPath(id, contentType);
      if (!fs.existsSync(filePath)) return null;
      return { bytes: fs.readFileSync(filePath), contentType };
    } catch {
      return null;
    }
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
