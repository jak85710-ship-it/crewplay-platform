import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { getMatchById, listMatchReviewsPendingAdmin } from "@/lib/matches";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const pending = await listMatchReviewsPendingAdmin();
  const enriched = await Promise.all(
    pending.map(async (review) => {
      const session = await getMatchById(review.match_id);
      return {
        ...review,
        venue_name: session?.venue_name ?? null,
        scheduled_start: session?.scheduled_start ?? null,
      };
    })
  );

  return NextResponse.json({ ok: true, pending: enriched });
}
