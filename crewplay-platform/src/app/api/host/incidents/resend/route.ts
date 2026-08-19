import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sendHostIncidentReportEmails } from "@/lib/email";
import { appendHostIncidentTimelineEvent, getHostIncidentById } from "@/lib/host-incidents";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";

const EVENT_LABELS: Record<string, string> = {
  accidental_injury: "意外受傷",
  malicious_foul: "惡意犯規",
  verbal_conflict: "言語衝突",
  equipment_damage: "設備損壞",
  other: "其他",
};
const STAGE_LABELS: Record<string, string> = {
  warmup: "熱身時",
  in_match: "比賽中",
  break: "休息時",
  post_match: "賽後",
};
const ACTION_LABELS: Record<string, string> = {
  ambulance: "叫救護車",
  onsite_settlement: "雙方自行和解",
  police: "報警",
  monitoring_only: "僅現場勸導紀錄",
};

function cleanText(value: unknown, max = 80): string {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const incidentId = cleanText(body?.incident_id);
  if (!incidentId) {
    return NextResponse.json({ error: "缺少 incident_id" }, { status: 400 });
  }

  const incident = await getHostIncidentById(incidentId);
  if (!incident) {
    return NextResponse.json({ error: "找不到事故紀錄" }, { status: 404 });
  }

  const ownedTeams = await listOwnedTeamsForMember(member);
  const team = ownedTeams.find((t) => t.id === incident.team_id);
  if (!team) {
    return NextResponse.json({ error: "您沒有重送此事故通知的權限" }, { status: 403 });
  }

  const mail = await sendHostIncidentReportEmails({
    incidentId: incident.id,
    ticketNo: incident.ticket_no || "",
    teamName: team.arena_name || incident.team_id,
    teamId: incident.team_id,
    bookingReference: incident.booking_reference,
    eventTypeLabel: EVENT_LABELS[incident.event_type] || incident.event_type,
    stageLabel: STAGE_LABELS[incident.stage] || incident.stage,
    actionLabel: ACTION_LABELS[incident.action_taken] || incident.action_taken,
    summary: incident.summary,
    reportedAt: incident.created_at,
    reporterEmail: incident.reported_by_email || "",
    reporterPhone: incident.reported_by_phone || "",
  });

  if (!mail.sent) {
    return NextResponse.json(
      { error: `重送失敗：${mail.error || "mail_send_failed"}`, mail },
      { status: 500 }
    );
  }

  await appendHostIncidentTimelineEvent({
    incidentId: incident.id,
    type: "mail_resent",
    note: "團主手動重送事故通知信",
    actor: "host",
  });

  return NextResponse.json({ ok: true, mail });
}

