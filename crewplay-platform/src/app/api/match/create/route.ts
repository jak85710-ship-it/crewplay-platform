import { NextResponse } from "next/server";

import { checkMemberCanMatch } from "@/lib/member-credit";
import { createMatchSession } from "@/lib/matches";
import { isMemberKeyResult, requireMemberKey } from "@/lib/require-member-api";

export async function POST(req: Request) {
  const auth = await requireMemberKey();
  if (!isMemberKeyResult(auth)) return auth;

  const gate = await checkMemberCanMatch(auth.memberKey);
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.block_reason ?? "無法使用 1VS1 匹配" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const skillLevel = String(body.skill_level ?? "").trim();
    const scheduledStart = String(body.scheduled_start ?? "").trim();
    const scheduledEnd = String(body.scheduled_end ?? "").trim();

    if (!skillLevel || !scheduledStart || !scheduledEnd) {
      return NextResponse.json({ error: "請填寫程度與時段" }, { status: 400 });
    }

    if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
      return NextResponse.json({ error: "結束時間需晚於開始時間" }, { status: 400 });
    }

    const session = await createMatchSession({
      hostMemberKey: auth.memberKey,
      skillLevel,
      scheduledStart,
      scheduledEnd,
    });

    return NextResponse.json({ ok: true, match: session });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "建立失敗" },
      { status: 500 }
    );
  }
}
