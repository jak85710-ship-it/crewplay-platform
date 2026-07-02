import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { reviewVerification } from "@/lib/member-credit";

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const memberKey = String(body.member_key ?? "").trim();
    const action = body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;
    const reason = String(body.reason ?? "").trim();

    if (!memberKey || !action) {
      return NextResponse.json({ error: "參數不完整" }, { status: 400 });
    }

    const profile = await reviewVerification(memberKey, action, "admin", reason);
    if (!profile) {
      return NextResponse.json({ error: "找不到待審項目" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      verification_status: profile.verification_status,
      member_key: profile.member_key,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "審核失敗" },
      { status: 500 }
    );
  }
}
