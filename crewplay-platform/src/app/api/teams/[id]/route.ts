import { NextResponse } from "next/server";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const team = await getTeamById(id);
  if (!team) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ team: enrichTeamFromIntro(team) });
}
