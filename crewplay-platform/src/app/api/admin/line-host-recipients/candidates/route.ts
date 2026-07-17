import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { listLineHostCandidates } from "@/lib/line-host-candidates";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  const items = await listLineHostCandidates();
  return NextResponse.json({ ok: true, items });
}
