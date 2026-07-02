import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { adminVerifyMatchNoShow } from "@/lib/matches";

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const reviewId = String(body.review_id ?? "").trim();
    if (!reviewId) {
      return NextResponse.json({ error: "請提供 review_id" }, { status: 400 });
    }

    const result = await adminVerifyMatchNoShow(reviewId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      review: result.review,
      message: "已核實缺席，對方信用分已扣除且 1V1 功能停用 90 日。",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "核實失敗" },
      { status: 500 }
    );
  }
}
