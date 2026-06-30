import { NextResponse } from "next/server";

import { getLineMemberFromRequest } from "@/lib/host-checkin-auth";
import { verifyHostCheckInSession } from "@/lib/host-checkin-session";
import { verifyHostPortalToken } from "@/lib/host-portal-token";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const portalToken = String(searchParams.get("portalToken") ?? "").trim();
  const portal = verifyHostPortalToken(portalToken);
  if (!portal) {
    return NextResponse.json({ error: "核銷連結無效或已過期" }, { status: 400 });
  }

  const member = getLineMemberFromRequest(req);
  const hostSession = verifyHostCheckInSession(req, portal.teamId);

  return NextResponse.json({
    ok: true,
    lineLoggedIn: Boolean(member),
    hostAuthenticated: Boolean(hostSession),
    displayName: member?.displayName ?? null,
  });
}
