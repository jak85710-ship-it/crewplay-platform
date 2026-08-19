import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { listHostIncidentReports } from "@/lib/host-incidents";
import { getAllTeams } from "@/lib/teams";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") || "all").trim();
  const teamId = String(url.searchParams.get("team_id") || "").trim();

  const [teams, incidents] = await Promise.all([getAllTeams(), listHostIncidentReports()]);
  const teamMap = Object.fromEntries(teams.map((team) => [team.id, team]));

  const filtered = incidents.filter((incident) => {
    const rowStatus = incident.status === "closed" ? "closed" : "open";
    if (status === "open" && rowStatus !== "open") return false;
    if (status === "closed" && rowStatus !== "closed") return false;
    if (teamId && incident.team_id !== teamId) return false;
    return true;
  });

  return NextResponse.json({
    ok: true,
    incidents: filtered.slice(0, 400).map((incident) => ({
      ...incident,
      team_name: teamMap[incident.team_id]?.arena_name || incident.team_id,
      team_region: teamMap[incident.team_id]?.region || "",
    })),
  });
}

