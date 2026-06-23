import { NextResponse } from "next/server";
import { getAllTeams } from "@/lib/teams";

export async function GET() {
  const teams = await getAllTeams();
  return NextResponse.json({ count: teams.length, teams });
}
