import { NextResponse } from "next/server";

import { type VenueSubmission } from "@/lib/email";
import { getJoinVenueFee } from "@/lib/join-fees";
import { getListingPaymentUrl } from "@/lib/listing-payment";
import { hasSubmissionImage } from "@/lib/submission-images";
import { createTradeNo, saveVenueSubmission } from "@/lib/submissions";

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
      "venue_name",
      "address",
      "price",
      "phone",
      "line_id",
      "capacity",
      "court_count",
      "time_slots",
    ];
    const absent = missing(body, required);
    if (absent.length > 0) {
      return NextResponse.json({ error: `請填寫：${absent.join("、")}` }, { status: 400 });
    }

    const trustImageId = String(body.trust_image_id ?? "").trim();
    if (!trustImageId) {
      return NextResponse.json({ error: "請上傳場地照片" }, { status: 400 });
    }
    if (!(await hasSubmissionImage(trustImageId))) {
      return NextResponse.json({ error: "場地照片無效，請重新上傳" }, { status: 400 });
    }

    const platformFee = getJoinVenueFee();
    const merchantTradeNo = createTradeNo("CV");
    const paymentUrl = getListingPaymentUrl();

    const record: VenueSubmission = {
      id: crypto.randomUUID(),
      submitted_at: new Date().toISOString(),
      venue_name: String(body.venue_name).trim(),
      address: String(body.address).trim(),
      price: String(body.price).trim(),
      phone: String(body.phone).trim(),
      line_id: String(body.line_id).trim(),
      capacity: String(body.capacity).trim(),
      court_count: String(body.court_count).trim(),
      time_slots: body.time_slots as string[],
      trust_image_id: trustImageId,
    };

    try {
      await saveVenueSubmission(record, merchantTradeNo, platformFee);
    } catch (saveErr) {
      console.error("saveVenueSubmission failed:", saveErr);
    }

    return NextResponse.json({
      ok: true,
      id: record.id,
      paymentUrl,
      platformFee,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
