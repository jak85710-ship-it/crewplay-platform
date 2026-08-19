import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { bookingReference } from "@/lib/booking-ref";
import { getBookingById } from "@/lib/bookings";
import { sendHostIncidentReportEmails } from "@/lib/email";
import {
  type HostIncidentRecord,
  saveHostIncidentReport,
  listHostIncidentReports,
} from "@/lib/host-incidents";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";

const EVENT_TYPES = new Set([
  "accidental_injury",
  "malicious_foul",
  "verbal_conflict",
  "equipment_damage",
  "other",
]);
const STAGES = new Set(["warmup", "in_match", "break", "post_match"]);
const ACTIONS = new Set(["ambulance", "onsite_settlement", "police", "monitoring_only"]);
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

function cleanText(value: unknown, max = 500): string {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function GET() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const ownedTeams = await listOwnedTeamsForMember(member);
  const incidents = await listHostIncidentReports(ownedTeams.map((t) => t.id));
  const rows = incidents.slice(0, 80);
  return NextResponse.json({ incidents: rows });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "提交格式錯誤" }, { status: 400 });
  }

  const teamId = cleanText(body.team_id, 80);
  const bookingId = cleanText(body.booking_id, 80);
  const bookingRefInput = cleanText(body.booking_reference, 30).toUpperCase();
  const eventType = cleanText(body.event_type, 40);
  const stage = cleanText(body.stage, 30);
  const actionTaken = cleanText(body.action_taken, 40);
  const summary = cleanText(body.summary, 600);

  if (!teamId || !summary) {
    return NextResponse.json({ error: "請填寫完整必填欄位" }, { status: 400 });
  }
  if (!EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "事件類型不正確" }, { status: 400 });
  }
  if (!STAGES.has(stage)) {
    return NextResponse.json({ error: "發生階段不正確" }, { status: 400 });
  }
  if (!ACTIONS.has(actionTaken)) {
    return NextResponse.json({ error: "現場處置不正確" }, { status: 400 });
  }

  const ownedTeams = await listOwnedTeamsForMember(member);
  if (!ownedTeams.some((t) => t.id === teamId)) {
    return NextResponse.json({ error: "您只能通報自己開團的場次" }, { status: 403 });
  }
  const team = ownedTeams.find((t) => t.id === teamId);
  if (!team) {
    return NextResponse.json({ error: "找不到團隊資料" }, { status: 404 });
  }

  let bookingReferenceText = bookingRefInput;
  if (bookingId) {
    const booking = await getBookingById(bookingId);
    if (!booking || booking.team_id !== teamId) {
      return NextResponse.json({ error: "預約資訊不屬於此團" }, { status: 400 });
    }
    bookingReferenceText = bookingReference(booking);
  }

  const memberKey = getMemberKeyFromSession(member);
  if (!memberKey) {
    return NextResponse.json({ error: "無法識別團主身分，請重新登入" }, { status: 401 });
  }

  const record = await saveHostIncidentReport({
    team_id: teamId,
    booking_id: bookingId,
    booking_reference: bookingReferenceText,
    event_type: eventType as HostIncidentRecord["event_type"],
    stage: stage as HostIncidentRecord["stage"],
    action_taken: actionTaken as HostIncidentRecord["action_taken"],
    summary,
    reported_by_member_key: memberKey,
    reported_by_email: String(member.email || "").trim().toLowerCase(),
    reported_by_phone: normalizePhone(String(member.phone || member.contactPhone || "")) || "",
  });

  const mailResult = await sendHostIncidentReportEmails({
    incidentId: record.id,
    teamName: team.arena_name || teamId,
    teamId,
    bookingReference: bookingReferenceText,
    eventTypeLabel: EVENT_LABELS[eventType] || eventType,
    stageLabel: STAGE_LABELS[stage] || stage,
    actionLabel: ACTION_LABELS[actionTaken] || actionTaken,
    summary,
    reportedAt: record.created_at,
    reporterEmail: record.reported_by_email || "",
    reporterPhone: record.reported_by_phone || "",
  });

  return NextResponse.json({
    ok: true,
    incident: record,
    mail: mailResult,
  });
}

