import { NextResponse } from "next/server";

import { normalizePhone } from "@/lib/phone-auth";
import { verifyStaffPhoneOtp } from "@/lib/staff-phone-auth";
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

    const phoneRaw = String(body.phone ?? "");
    const auth = verifyStaffPhoneOtp(req, phoneRaw, String(body.code ?? ""));
    if (!auth.ok) {
      const res = NextResponse.json({ error: auth.error }, { status: 401 });
      if (auth.setCookie) res.headers.set("Set-Cookie", auth.setCookie);
      return res;
    }

    const phone = normalizePhone(phoneRaw) || phoneRaw.trim();
    const res = NextResponse.json({ ok: true, teamId: portal.teamId });
    res.headers.set("Set-Cookie", buildHostSessionCookie(portal.teamId, phone));
    if (auth.setCookie) {
      res.headers.append("Set-Cookie", auth.setCookie);
    }
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "驗證失敗" },
      { status: 500 }
    );
  }
}
