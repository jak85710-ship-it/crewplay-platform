import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { listHostSubmissionsByReviewStatus, type SubmissionReviewStatus } from "@/lib/submissions";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const url = new URL(req.url);
  const statusParam = String(url.searchParams.get("status") || "pending_review").trim();
  const status: SubmissionReviewStatus | "all" =
    statusParam === "approved" || statusParam === "rejected" || statusParam === "all"
      ? statusParam
      : "pending_review";

  const rows = await listHostSubmissionsByReviewStatus(status);
  return NextResponse.json({
    ok: true,
    pending: rows.map((row) => ({
      id: row.id,
      merchant_trade_no: row.merchant_trade_no,
      submitted_at: row.submitted_at,
      sport: row.sport,
      team_name: row.team_name,
      location: row.location,
      weekday: row.weekday,
      time_slots: row.time_slots,
      vacancies: row.vacancies,
      fee: row.fee,
      skill_level: row.skill_level,
      equipment: row.equipment,
      balls: row.balls,
      phone: row.phone,
      email: row.email,
      trust_image_id: row.trust_image_id,
      review_status: row.review_status || "pending_review",
      reviewed_at: row.reviewed_at || "",
      review_note: row.review_note || "",
      published_team_id: row.published_team_id || "",
    })),
  });
}

