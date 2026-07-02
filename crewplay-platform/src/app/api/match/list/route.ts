import { NextResponse } from "next/server";

import { listWaitingMatches } from "@/lib/matches";

export async function GET() {
  const matches = await listWaitingMatches();
  return NextResponse.json({ ok: true, matches });
}
