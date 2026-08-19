import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { listHostIncidentReports } from "@/lib/host-incidents";
import { getAllTeams } from "@/lib/teams";

function esc(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") || "all").trim();
  const from = String(url.searchParams.get("from") || "").trim();
  const to = String(url.searchParams.get("to") || "").trim();

  const [teams, incidents] = await Promise.all([getAllTeams(), listHostIncidentReports()]);
  const teamMap = Object.fromEntries(teams.map((team) => [team.id, team]));
  const fromTs = from ? new Date(from).getTime() : null;
  const toTs = to ? new Date(to).getTime() : null;

  const rows = incidents.filter((incident) => {
    const rowStatus = incident.status === "closed" ? "closed" : "open";
    if (status === "open" && rowStatus !== "open") return false;
    if (status === "closed" && rowStatus !== "closed") return false;
    const createdTs = new Date(incident.created_at).getTime();
    if (fromTs && Number.isFinite(fromTs) && createdTs < fromTs) return false;
    if (toTs && Number.isFinite(toTs) && createdTs > toTs + 24 * 60 * 60 * 1000 - 1) return false;
    return true;
  });

  const header = [
    "ticket_no",
    "status",
    "team_id",
    "team_name",
    "team_region",
    "booking_reference",
    "event_type",
    "stage",
    "action_taken",
    "summary",
    "created_at",
    "closed_at",
    "close_note",
  ];
  const csv = [
    header.join(","),
    ...rows.map((incident) =>
      [
        incident.ticket_no || "",
        incident.status || "open",
        incident.team_id,
        teamMap[incident.team_id]?.arena_name || "",
        teamMap[incident.team_id]?.region || "",
        incident.booking_reference || "",
        incident.event_type,
        incident.stage,
        incident.action_taken,
        incident.summary,
        incident.created_at,
        incident.closed_at || "",
        incident.close_note || "",
      ]
        .map(esc)
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="incident-report-${Date.now()}.csv"`,
    },
  });
}

