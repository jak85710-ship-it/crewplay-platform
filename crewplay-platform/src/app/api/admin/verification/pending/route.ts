import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { listPendingVerifications } from "@/lib/member-credit";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const pending = await listPendingVerifications();
  return NextResponse.json({
    ok: true,
    pending: pending.map((p) => ({
      member_key: p.member_key,
      display_name: p.display_name ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      verification_image_id: p.verification_image_id ?? null,
      updated_at: p.updated_at,
    })),
  });
}
