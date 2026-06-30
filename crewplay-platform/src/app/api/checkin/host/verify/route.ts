import { NextResponse } from "next/server";

import { getLineMemberFromRequest } from "@/lib/host-checkin-auth";
import { buildHostSessionCookie } from "@/lib/host-checkin-session";
import { verifyHostPortalToken } from "@/lib/host-portal-token";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const portalToken = String(body.portalToken ?? "").trim();
    const portal = verifyHostPortalToken(portalToken);
    if (!portal) {
      return NextResponse.json({ error: "核銷連結無效或已過期" }, { status: 400 });
    }

    const member = getLineMemberFromRequest(req);
    if (!member?.lineUid) {
      return NextResponse.json({ error: "請先使用 LINE 登入" }, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      teamId: portal.teamId,
      displayName: member.displayName,
    });
    res.headers.set("Set-Cookie", buildHostSessionCookie(portal.teamId, member.lineUid));
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "驗證失敗" },
      { status: 500 }
    );
  }
}
