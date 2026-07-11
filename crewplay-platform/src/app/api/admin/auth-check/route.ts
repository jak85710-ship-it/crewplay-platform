import { NextResponse } from "next/server";
import { verifyAdminKey } from "@/lib/analytics-store";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ ok: false, error: "未授權" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
