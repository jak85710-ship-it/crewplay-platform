import { NextRequest, NextResponse } from "next/server";
import { filterTeams, getAllTeams } from "@/lib/teams";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sport = searchParams.get("sport") ?? undefined;
  const region = searchParams.get("region") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const teams = await getAllTeams();
  const filtered = filterTeams(teams, { sport, region, q });

  return NextResponse.json({
    count: filtered.length,
    total: teams.length,
    teams: filtered,
  });
}
