import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { checkInMatchByToken } from "@/lib/matches";

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    if (!token) {
      return NextResponse.json({ error: "請提供核銷條碼" }, { status: 400 });
    }

    const result = await checkInMatchByToken(token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      match_id: result.session.id,
      venue_name: result.session.venue_name,
      checked_in_at: result.session.checked_in_at,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "核銷失敗" },
      { status: 500 }
    );
  }
}
