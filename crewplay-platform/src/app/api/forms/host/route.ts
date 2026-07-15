import { NextResponse } from "next/server";

import { sendHostFormEmails, type HostSubmission } from "@/lib/email";
import { siteUrl } from "@/lib/payment/site-url";
import { hasSubmissionImage } from "@/lib/submission-images";
import { createTradeNo, saveHostSubmission } from "@/lib/submissions";

function missing(body: Record<string, unknown>, keys: string[]) {
  return keys.filter((k) => {
    const v = body[k];
    if (Array.isArray(v)) return v.length === 0;
    return v === undefined || v === null || String(v).trim() === "";
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const required = [
      "sport",
      "location",
      "weekday",
      "time_slots",
      "fee",
      "skill_level",
      "team_name",
      "equipment",
      "balls",
      "phone",
      "email",
    ];
    const absent = missing(body, required);
    if (absent.length > 0) {
      return NextResponse.json({ error: `請填寫：${absent.join("、")}` }, { status: 400 });
    }
    if (!body.agreed) {
      return NextResponse.json({ error: "請同意團主資訊用途規範" }, { status: 400 });
    }

    const trustImageId = String(body.trust_image_id ?? "").trim();
    if (!trustImageId) {
      return NextResponse.json({ error: "請上傳團隊照片" }, { status: 400 });
    }
    if (!(await hasSubmissionImage(trustImageId))) {
      return NextResponse.json({ error: "團隊照片無效，請重新上傳" }, { status: 400 });
    }

    const platformFee = 0;
    const merchantTradeNo = createTradeNo("CH");
    const resultUrl = `${siteUrl()}/join/result?kind=host&status=ok&mode=free&tradeNo=${merchantTradeNo}`;

    const record: HostSubmission = {
      id: crypto.randomUUID(),
      submitted_at: new Date().toISOString(),
      sport: String(body.sport).trim(),
      location: String(body.location).trim(),
      weekday: String(body.weekday).trim(),
      time_slots: body.time_slots as string[],
      fee: String(body.fee).trim(),
      skill_level: String(body.skill_level).trim(),
      team_name: String(body.team_name).trim(),
      equipment: String(body.equipment).trim(),
      balls: String(body.balls).trim(),
      phone: String(body.phone).trim(),
      email: String(body.email).trim(),
      trust_image_id: trustImageId,
    };

    try {
      await saveHostSubmission(record, merchantTradeNo, platformFee);
    } catch (saveErr) {
      console.error("saveHostSubmission failed:", saveErr);
    }
    try {
      await sendHostFormEmails({
        ...record,
        result_url: resultUrl,
      });
    } catch (mailErr) {
      console.error("sendHostFormEmails failed:", mailErr);
    }

    return NextResponse.json({
      ok: true,
      id: record.id,
      resultUrl,
      platformFee,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
