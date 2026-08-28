import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { sendHostSubmissionReviewEmail } from "@/lib/email";
import { publishHostSubmissionToTeams } from "@/lib/host-submission-publish";
import { getHostByTradeNo, reviewHostSubmission } from "@/lib/submissions";

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const tradeNo = String(body.trade_no || "").trim();
    const action = body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : "";
    const note = String(body.note || "").trim().slice(0, 300);
    const reviewedBy = String(body.reviewed_by || "admin").trim().slice(0, 80) || "admin";
    const notifyEmail = Boolean(body.notify_email);

    if (!tradeNo || !action) {
      return NextResponse.json({ error: "參數不完整" }, { status: 400 });
    }

    const submission = await getHostByTradeNo(tradeNo);
    if (!submission) {
      return NextResponse.json({ error: "找不到該申請資料" }, { status: 404 });
    }
    if ((submission.review_status || "pending_review") !== "pending_review") {
      return NextResponse.json({ error: "此申請已審核過" }, { status: 409 });
    }

    let teamId = "";
    let publishVia: "supabase" | "local" | "" = "";
    if (action === "approve") {
      const published = await publishHostSubmissionToTeams(submission);
      teamId = published.teamId;
      publishVia = published.via;
    }

    const reviewed = await reviewHostSubmission({
      tradeNo,
      action,
      reviewedBy,
      note,
      publishedTeamId: teamId,
    });
    if (!reviewed) {
      return NextResponse.json({ error: "審核寫入失敗" }, { status: 500 });
    }

    let notify: { configured: boolean; sent: boolean; error?: string } | undefined;
    if (notifyEmail) {
      notify = await sendHostSubmissionReviewEmail({
        to: reviewed.email,
        teamName: reviewed.team_name,
        action,
        note,
        teamId,
      });
    }

    return NextResponse.json({
      ok: true,
      review_status: reviewed.review_status,
      published_team_id: teamId,
      publish_via: publishVia,
      notify,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "審核失敗" },
      { status: 500 }
    );
  }
}

