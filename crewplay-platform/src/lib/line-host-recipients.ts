import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

export type LineHostRecipientsConfig = {
  globalRecipients: string[];
  byTeam: Record<string, string[]>;
  updatedAt: string;
};

const BLOB_STORE = "crewplay-line-notify";
const BLOB_KEY = "host-recipients";
const LOCAL_FILE = path.join(process.cwd(), ".data", "line-host-recipients.json");

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyConfig(): LineHostRecipientsConfig {
  return { globalRecipients: [], byTeam: {}, updatedAt: new Date().toISOString() };
}

function normalizeIds(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((v) => String(v || "").trim()).filter(Boolean))];
}

function normalizeConfig(raw: unknown): LineHostRecipientsConfig {
  if (!raw || typeof raw !== "object") return emptyConfig();
  const data = raw as Partial<LineHostRecipientsConfig>;
  const byTeamInput = data.byTeam && typeof data.byTeam === "object" ? data.byTeam : {};
  const byTeam: Record<string, string[]> = {};
  for (const [teamId, ids] of Object.entries(byTeamInput || {})) {
    const key = String(teamId || "").trim();
    if (!key) continue;
    byTeam[key] = normalizeIds(ids);
  }
  return {
    globalRecipients: normalizeIds(data.globalRecipients),
    byTeam,
    updatedAt: String(data.updatedAt || new Date().toISOString()),
  };
}

function readLocalConfig(): LineHostRecipientsConfig {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return emptyConfig();
    const raw = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8"));
    return normalizeConfig(raw);
  } catch {
    return emptyConfig();
  }
}

function writeLocalConfig(config: LineHostRecipientsConfig) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(config, null, 2), "utf8");
}

async function readBlobConfig(): Promise<LineHostRecipientsConfig> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (!data) return readLocalConfig();
  return normalizeConfig(data);
}

async function writeBlobConfig(config: LineHostRecipientsConfig): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, config);
}

export async function getLineHostRecipientsConfig(): Promise<LineHostRecipientsConfig> {
  if (useLocalFileStorage()) return readLocalConfig();
  return readBlobConfig();
}

export async function saveLineHostRecipientsConfig(input: {
  globalRecipients: string[];
  byTeam: Record<string, string[]>;
}): Promise<LineHostRecipientsConfig> {
  const config = normalizeConfig({
    globalRecipients: input.globalRecipients,
    byTeam: input.byTeam,
    updatedAt: new Date().toISOString(),
  });
  if (useLocalFileStorage()) {
    writeLocalConfig(config);
    return config;
  }
  await writeBlobConfig(config);
  return config;
}
