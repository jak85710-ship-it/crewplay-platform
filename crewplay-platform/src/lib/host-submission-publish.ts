import fs from "fs";
import path from "path";

import type { Team, TeamsManifest } from "@/types";
import type { HostSubmissionRecord } from "@/lib/submissions";
import { getSupabaseAdmin } from "@/lib/teams";
import { submissionImagePublicUrl } from "@/lib/submission-images";

const REGIONS = [
  "台北市",
  "新北市",
  "基隆市",
  "桃園市",
  "新竹市",
  "新竹縣",
  "苗栗縣",
  "台中市",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義市",
  "嘉義縣",
  "台南市",
  "高雄市",
  "屏東縣",
  "宜蘭縣",
  "花蓮縣",
  "台東縣",
  "澎湖縣",
  "金門縣",
  "連江縣",
];

function inferRegion(rawLocation: string): string {
  const text = String(rawLocation || "").trim();
  if (!text) return "";
  for (const region of REGIONS) {
    if (text.includes(region)) return region;
  }
  const match = text.match(/^[^\s，,。]{2,4}[市縣]/);
  return match?.[0] || "";
}

function parseFeeAmount(rawFee: string): number | null {
  const fee = String(rawFee || "");
  const match = fee.match(/([0-9]{2,6})/);
  if (!match?.[1]) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

function composeIntroduce(submission: HostSubmissionRecord): string {
  return [
    `地點：${submission.location}`,
    `時間：${submission.weekday} ${submission.time_slots.join("、")}`,
    `程度：${submission.skill_level}`,
    `用球：${submission.balls}`,
    `費用：${submission.fee}`,
    `器材：${submission.equipment}`,
    `缺額人數：${submission.vacancies || "未填寫"}`,
    `聯絡方式：${submission.phone}${submission.email ? ` / ${submission.email}` : ""}`,
  ].join("\n");
}

function readLocalTeamsManifest(): TeamsManifest {
  const filePath = path.join(process.cwd(), "public", "data", "teams.json");
  if (!fs.existsSync(filePath)) {
    return { exportedAt: new Date().toISOString(), count: 0, teams: [] };
  }
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw) as TeamsManifest;
  return {
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    count: Number(parsed.count || 0),
    teams: Array.isArray(parsed.teams) ? parsed.teams : [],
  };
}

function writeLocalTeamsManifest(manifest: TeamsManifest): void {
  const filePath = path.join(process.cwd(), "public", "data", "teams.json");
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), "utf8");
}

function buildTeamFromSubmission(submission: HostSubmissionRecord, existing?: Team): Team {
  const now = new Date().toISOString();
  return {
    id: existing?.id || crypto.randomUUID(),
    sheet_row: existing?.sheet_row || 0,
    sport: submission.sport,
    arena_name: submission.team_name,
    introduce: composeIntroduce(submission),
    photo: submission.trust_image_id ? submissionImagePublicUrl(submission.trust_image_id) : existing?.photo || "",
    assign_url: existing?.assign_url || "",
    region: inferRegion(submission.location) || existing?.region || "",
    location: submission.location,
    fee_amount: parseFeeAmount(submission.fee),
    fee_label: submission.fee || "",
    status: "published",
    is_featured: existing?.is_featured || false,
    published_at: existing?.published_at || now,
    updated_at: now,
  };
}

async function publishToSupabase(submission: HostSubmissionRecord): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data: existingRows } = await supabase
    .from("teams")
    .select("*")
    .eq("arena_name", submission.team_name)
    .eq("location", submission.location)
    .limit(1);

  const existing = existingRows?.[0] as Record<string, unknown> | undefined;
  const team = buildTeamFromSubmission(submission, existing as Team | undefined);
  const row = {
    ...team,
    sheet_row: Number(existing?.sheet_row || Date.now()),
  };
  if (existing?.id) {
    const { error } = await supabase.from("teams").update(row).eq("id", String(existing.id));
    if (error) throw error;
    return String(existing.id);
  }
  const { data, error } = await supabase.from("teams").insert(row).select("id").maybeSingle();
  if (error) throw error;
  return String((data as { id?: string } | null)?.id || row.id);
}

function publishToLocal(submission: HostSubmissionRecord): string {
  const manifest = readLocalTeamsManifest();
  const existingIdx = manifest.teams.findIndex(
    (team) => team.arena_name === submission.team_name && team.location === submission.location
  );
  const existing = existingIdx >= 0 ? manifest.teams[existingIdx] : undefined;
  const team = buildTeamFromSubmission(submission, existing);
  if (!team.sheet_row) {
    const maxRow = manifest.teams.reduce((max, row) => Math.max(max, Number(row.sheet_row || 0)), 0);
    team.sheet_row = maxRow + 1;
  }

  if (existingIdx >= 0) manifest.teams[existingIdx] = team;
  else manifest.teams.push(team);
  manifest.exportedAt = new Date().toISOString();
  manifest.count = manifest.teams.length;
  writeLocalTeamsManifest(manifest);
  return team.id;
}

export async function publishHostSubmissionToTeams(
  submission: HostSubmissionRecord
): Promise<{ teamId: string; via: "supabase" | "local" }> {
  const useSupabase = process.env.TEAMS_DATA_SOURCE === "supabase";
  if (useSupabase) {
    const teamId = await publishToSupabase(submission);
    if (teamId) return { teamId, via: "supabase" };
  }
  return { teamId: publishToLocal(submission), via: "local" };
}

