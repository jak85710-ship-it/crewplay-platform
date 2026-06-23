import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Team, TeamsManifest } from "@/types";
import { parseFee } from "./utils";
import fs from "fs";
import path from "path";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!adminClient) {
    adminClient = createClient(url, key);
  }
  return adminClient;
}

export function getSupabasePublic(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function readLocalManifest(): TeamsManifest | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "teams.json");
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw) as TeamsManifest;
  } catch {
    return null;
  }
}

function mapRow(row: Record<string, unknown>): Team {
  return {
    id: String(row.id ?? `row-${row.sheet_row}`),
    sheet_row: Number(row.sheet_row),
    sport: String(row.sport ?? ""),
    arena_name: String(row.arena_name ?? ""),
    introduce: String(row.introduce ?? ""),
    photo: String(row.photo ?? ""),
    assign_url: String(row.assign_url ?? ""),
    region: String(row.region ?? ""),
    location: String(row.location ?? ""),
    fee_amount: row.fee_amount != null ? Number(row.fee_amount) : null,
    fee_label: String(row.fee_label ?? ""),
    status: (row.status as Team["status"]) ?? "published",
    published_at: row.published_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export async function getAllTeams(): Promise<Team[]> {
  const manifest = readLocalManifest();
  const useSupabase = process.env.TEAMS_DATA_SOURCE === "supabase";

  if (!useSupabase && manifest?.teams?.length) {
    return manifest.teams.filter((t) => t.status !== "hidden");
  }

  const supabase = getSupabasePublic();
  if (supabase) {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("status", "published")
      .order("sheet_row", { ascending: true });
    if (!error && data?.length) {
      return data.map((r) => mapRow(r as Record<string, unknown>));
    }
  }

  if (manifest?.teams?.length) {
    return manifest.teams.filter((t) => t.status !== "hidden");
  }

  return [];
}

export async function getTeamById(id: string): Promise<Team | null> {
  const supabase = getSupabasePublic();
  if (supabase && !id.startsWith("row-")) {
    const { data } = await supabase.from("teams").select("*").eq("id", id).maybeSingle();
    if (data) return mapRow(data as Record<string, unknown>);
  }

  const rowMatch = id.match(/^row-(\d+)$/);
  const teams = await getAllTeams();
  if (rowMatch) {
    const row = parseInt(rowMatch[1], 10);
    return teams.find((t) => t.sheet_row === row) ?? null;
  }
  return teams.find((t) => t.id === id) ?? null;
}

export function enrichTeamFromIntro(team: Team): Team {
  if (team.fee_amount != null && team.fee_label) return team;
  const { amount, label } = parseFee(team.introduce);
  return { ...team, fee_amount: team.fee_amount ?? amount, fee_label: team.fee_label || label };
}

export function filterTeams(
  teams: Team[],
  opts: { sport?: string; region?: string; q?: string }
): Team[] {
  let list = teams.map(enrichTeamFromIntro);
  if (opts.sport) list = list.filter((t) => t.sport === opts.sport);
  if (opts.region) list = list.filter((t) => t.region.includes(opts.region!));
  if (opts.q) {
    const q = opts.q.toLowerCase();
    list = list.filter(
      (t) =>
        t.arena_name.toLowerCase().includes(q) ||
        t.sport.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.introduce.toLowerCase().includes(q)
    );
  }
  return list;
}
