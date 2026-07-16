import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";
import type { HostLead, HostSubscriptionProfile, SubscriptionPlan } from "@/types";

export const FREE_MONTHLY_LEAD_QUOTA = 5;
export const URGENT_PUSH_COOLDOWN_HOURS = 24;

type UrgentPushLog = {
  id: string;
  host_id: string;
  event_id: string;
  sport?: string;
  region?: string;
  message: string;
  created_at: string;
};

type FreemiumManifest = {
  subscriptions: Record<string, HostSubscriptionProfile>;
  leads: HostLead[];
  featured_events: Record<string, boolean>;
  urgent_push_logs: UrgentPushLog[];
};

const BLOB_STORE = "crewplay-host-freemium";
const BLOB_KEY = "manifest";
const LOCAL_FILE = path.join(process.cwd(), ".data", "host-freemium.json");

function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function emptyManifest(): FreemiumManifest {
  return {
    subscriptions: {},
    leads: [],
    featured_events: {},
    urgent_push_logs: [],
  };
}

function nextResetDateISO(from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

function normalizePlan(value: unknown): SubscriptionPlan {
  return String(value || "").toUpperCase() === "PRO" ? "PRO" : "FREE";
}

function normalizeLead(input: HostLead): HostLead {
  return {
    ...input,
    host_id: String(input.host_id || "").trim(),
    team_id: String(input.team_id || "").trim(),
    player_info: {
      name: String(input.player_info?.name || "").trim(),
      email: String(input.player_info?.email || "").trim(),
      line_id: String(input.player_info?.line_id || "").trim(),
      note: String(input.player_info?.note || "").trim(),
      sport: String(input.player_info?.sport || "").trim(),
      region: String(input.player_info?.region || "").trim(),
    },
    is_unlocked: input.is_unlocked === true,
    unlocked_at: input.unlocked_at || null,
    created_at: String(input.created_at || new Date().toISOString()),
  };
}

function normalizeManifest(raw: unknown): FreemiumManifest {
  if (!raw || typeof raw !== "object") return emptyManifest();
  const data = raw as Partial<FreemiumManifest>;
  const subscriptionsRaw =
    data.subscriptions && typeof data.subscriptions === "object" ? data.subscriptions : {};
  const subscriptions: Record<string, HostSubscriptionProfile> = {};
  for (const [hostId, profile] of Object.entries(subscriptionsRaw || {})) {
    const p = (profile || {}) as Partial<HostSubscriptionProfile>;
    const id = String(hostId || "").trim();
    if (!id) continue;
    subscriptions[id] = {
      host_id: id,
      subscription_plan: normalizePlan(p.subscription_plan),
      monthly_leads_used: Math.max(0, Number(p.monthly_leads_used || 0)),
      quota_reset_date: String(p.quota_reset_date || nextResetDateISO()),
      updated_at: String(p.updated_at || new Date().toISOString()),
    };
  }

  const leads = Array.isArray(data.leads)
    ? data.leads
        .map((row) => normalizeLead(row as HostLead))
        .filter((row) => row.id && row.host_id && row.team_id)
    : [];

  const featuredEventsRaw =
    data.featured_events && typeof data.featured_events === "object" ? data.featured_events : {};
  const featured_events: Record<string, boolean> = {};
  for (const [eventId, flag] of Object.entries(featuredEventsRaw || {})) {
    const id = String(eventId || "").trim();
    if (!id) continue;
    featured_events[id] = flag === true;
  }

  const urgent_push_logs = Array.isArray(data.urgent_push_logs)
    ? data.urgent_push_logs
        .map((row) => row as Partial<UrgentPushLog>)
        .map((row) => ({
          id: String(row.id || crypto.randomUUID()),
          host_id: String(row.host_id || "").trim(),
          event_id: String(row.event_id || "").trim(),
          sport: String(row.sport || "").trim(),
          region: String(row.region || "").trim(),
          message: String(row.message || "").trim(),
          created_at: String(row.created_at || new Date().toISOString()),
        }))
        .filter((row) => row.host_id && row.event_id)
    : [];

  return {
    subscriptions,
    leads,
    featured_events,
    urgent_push_logs,
  };
}

function readLocalManifest(): FreemiumManifest {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return emptyManifest();
    const raw = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8"));
    return normalizeManifest(raw);
  } catch {
    return emptyManifest();
  }
}

function writeLocalManifest(manifest: FreemiumManifest) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

async function readBlobManifest(): Promise<FreemiumManifest> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  if (!data) return readLocalManifest();
  return normalizeManifest(data);
}

async function writeBlobManifest(manifest: FreemiumManifest): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, manifest);
}

async function loadManifest(): Promise<FreemiumManifest> {
  if (useLocalFileStorage()) return readLocalManifest();
  return readBlobManifest();
}

async function saveManifest(manifest: FreemiumManifest): Promise<void> {
  if (useLocalFileStorage()) {
    writeLocalManifest(manifest);
    return;
  }
  await writeBlobManifest(manifest);
}

function ensureQuotaReset(profile: HostSubscriptionProfile): HostSubscriptionProfile {
  const resetAt = new Date(profile.quota_reset_date).getTime();
  if (!Number.isFinite(resetAt) || Date.now() >= resetAt) {
    return {
      ...profile,
      monthly_leads_used: 0,
      quota_reset_date: nextResetDateISO(),
      updated_at: new Date().toISOString(),
    };
  }
  return profile;
}

export async function getHostSubscriptionProfile(hostId: string): Promise<HostSubscriptionProfile> {
  const id = String(hostId || "").trim();
  if (!id) {
    throw new Error("host_id_required");
  }
  const manifest = await loadManifest();
  const existing = manifest.subscriptions[id];
  const profile = ensureQuotaReset(
    existing || {
      host_id: id,
      subscription_plan: "FREE",
      monthly_leads_used: 0,
      quota_reset_date: nextResetDateISO(),
      updated_at: new Date().toISOString(),
    }
  );
  manifest.subscriptions[id] = profile;
  await saveManifest(manifest);
  return profile;
}

export async function setHostSubscriptionPlan(hostId: string, plan: SubscriptionPlan): Promise<HostSubscriptionProfile> {
  const profile = await getHostSubscriptionProfile(hostId);
  const manifest = await loadManifest();
  const updated: HostSubscriptionProfile = {
    ...profile,
    subscription_plan: normalizePlan(plan),
    updated_at: new Date().toISOString(),
  };
  manifest.subscriptions[updated.host_id] = updated;
  await saveManifest(manifest);
  return updated;
}

export async function listHostLeads(hostId: string): Promise<HostLead[]> {
  const id = String(hostId || "").trim();
  if (!id) return [];
  const manifest = await loadManifest();
  return manifest.leads
    .filter((lead) => lead.host_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function listAllHostLeads(): Promise<HostLead[]> {
  const manifest = await loadManifest();
  return [...manifest.leads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createHostLead(input: {
  host_id: string;
  team_id: string;
  player_info: HostLead["player_info"];
}): Promise<HostLead> {
  const lead = normalizeLead({
    id: crypto.randomUUID(),
    host_id: input.host_id,
    team_id: input.team_id,
    player_info: input.player_info,
    is_unlocked: false,
    unlocked_at: null,
    created_at: new Date().toISOString(),
  });
  const manifest = await loadManifest();
  manifest.leads.push(lead);
  await saveManifest(manifest);
  return lead;
}

export async function unlockLeadForHost(input: {
  host_id: string;
  lead_id: string;
}): Promise<
  | {
      ok: true;
      lead: HostLead;
      profile: HostSubscriptionProfile;
    }
  | {
      ok: false;
      code: "not_found" | "forbidden" | "requires_upgrade";
      error: string;
      requires_upgrade?: boolean;
      profile?: HostSubscriptionProfile;
    }
> {
  const hostId = String(input.host_id || "").trim();
  const leadId = String(input.lead_id || "").trim();
  if (!hostId || !leadId) {
    return { ok: false, code: "not_found", error: "lead_not_found" };
  }

  const manifest = await loadManifest();
  const idx = manifest.leads.findIndex((lead) => lead.id === leadId);
  if (idx < 0) {
    return { ok: false, code: "not_found", error: "lead_not_found" };
  }
  const lead = manifest.leads[idx];
  if (lead.host_id !== hostId) {
    return { ok: false, code: "forbidden", error: "forbidden" };
  }

  let profile = ensureQuotaReset(
    manifest.subscriptions[hostId] || {
      host_id: hostId,
      subscription_plan: "FREE",
      monthly_leads_used: 0,
      quota_reset_date: nextResetDateISO(),
      updated_at: new Date().toISOString(),
    }
  );

  if (!lead.is_unlocked) {
    if (profile.subscription_plan === "FREE" && profile.monthly_leads_used >= FREE_MONTHLY_LEAD_QUOTA) {
      manifest.subscriptions[hostId] = profile;
      await saveManifest(manifest);
      return {
        ok: false,
        code: "requires_upgrade",
        error: "free_quota_reached",
        requires_upgrade: true,
        profile,
      };
    }

    manifest.leads[idx] = {
      ...lead,
      is_unlocked: true,
      unlocked_at: new Date().toISOString(),
    };
    if (profile.subscription_plan === "FREE") {
      profile = {
        ...profile,
        monthly_leads_used: profile.monthly_leads_used + 1,
        updated_at: new Date().toISOString(),
      };
    }
    manifest.subscriptions[hostId] = profile;
    await saveManifest(manifest);
    return {
      ok: true,
      lead: manifest.leads[idx],
      profile,
    };
  }

  manifest.subscriptions[hostId] = profile;
  await saveManifest(manifest);
  return { ok: true, lead, profile };
}

export async function setEventFeatured(eventId: string, featured: boolean): Promise<void> {
  const id = String(eventId || "").trim();
  if (!id) throw new Error("event_id_required");
  const manifest = await loadManifest();
  manifest.featured_events[id] = featured === true;
  await saveManifest(manifest);
}

export async function getFeaturedEventMap(): Promise<Record<string, boolean>> {
  const manifest = await loadManifest();
  return { ...manifest.featured_events };
}

export async function canTriggerUrgentPush(input: {
  host_id: string;
  event_id: string;
  cooldownHours?: number;
}): Promise<{ ok: boolean; next_allowed_at?: string; last_sent_at?: string }> {
  const hostId = String(input.host_id || "").trim();
  const eventId = String(input.event_id || "").trim();
  const cooldownMs = Math.max(1, Number(input.cooldownHours || URGENT_PUSH_COOLDOWN_HOURS)) * 3600 * 1000;
  const manifest = await loadManifest();
  const logs = manifest.urgent_push_logs
    .filter((row) => row.host_id === hostId && row.event_id === eventId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const last = logs[0];
  if (!last) return { ok: true };
  const lastAt = new Date(last.created_at).getTime();
  const nextAt = lastAt + cooldownMs;
  if (!Number.isFinite(lastAt) || Date.now() >= nextAt) return { ok: true, last_sent_at: last.created_at };
  return {
    ok: false,
    last_sent_at: last.created_at,
    next_allowed_at: new Date(nextAt).toISOString(),
  };
}

export async function recordUrgentPush(input: {
  host_id: string;
  event_id: string;
  sport?: string;
  region?: string;
  message: string;
}): Promise<UrgentPushLog> {
  const log: UrgentPushLog = {
    id: crypto.randomUUID(),
    host_id: String(input.host_id || "").trim(),
    event_id: String(input.event_id || "").trim(),
    sport: String(input.sport || "").trim(),
    region: String(input.region || "").trim(),
    message: String(input.message || "").trim().slice(0, 500),
    created_at: new Date().toISOString(),
  };
  const manifest = await loadManifest();
  manifest.urgent_push_logs.push(log);
  if (manifest.urgent_push_logs.length > 10000) {
    manifest.urgent_push_logs = manifest.urgent_push_logs.slice(-10000);
  }
  await saveManifest(manifest);
  return log;
}

export async function listUrgentPushLogsForHost(hostId: string): Promise<UrgentPushLog[]> {
  const id = String(hostId || "").trim();
  if (!id) return [];
  const manifest = await loadManifest();
  return manifest.urgent_push_logs
    .filter((row) => row.host_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
