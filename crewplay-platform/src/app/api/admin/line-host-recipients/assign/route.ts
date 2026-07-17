import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { getLineHostRecipientsConfig, saveLineHostRecipientsConfig } from "@/lib/line-host-recipients";

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { team_id?: string; user_id?: string }
    | null;
  const teamId = String(body?.team_id || "").trim();
  const userId = String(body?.user_id || "").trim();
  if (!teamId || !userId) {
    return NextResponse.json({ error: "缺少 team_id 或 user_id" }, { status: 400 });
  }

  const current = await getLineHostRecipientsConfig();
  const nextByTeam = { ...current.byTeam };
  const currentTeam = Array.isArray(nextByTeam[teamId]) ? nextByTeam[teamId] : [];
  nextByTeam[teamId] = [...new Set([...currentTeam, userId])];

  const config = await saveLineHostRecipientsConfig({
    globalRecipients: current.globalRecipients || [],
    byTeam: nextByTeam,
  });

  return NextResponse.json({
    ok: true,
    team_id: teamId,
    user_id: userId,
    assigned: config.byTeam[teamId] || [],
  });
}
