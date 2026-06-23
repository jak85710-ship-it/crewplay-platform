import { NextResponse } from "next/server";

import { type VenueSubmission } from "@/lib/email";
import { getJoinVenueFee } from "@/lib/join-fees";
import { getPaymentProvider } from "@/lib/payment";
import { siteUrl } from "@/lib/payment/site-url";
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

    const platformFee = getJoinVenueFee();
    const merchantTradeNo = createTradeNo("CV");

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
    };

    await saveVenueSubmission(record, merchantTradeNo, platformFee);

    const provider = getPaymentProvider();
    const base = siteUrl();
    const checkout = provider.createCheckoutForm({
      merchantTradeNo,
      amount: platformFee,
      itemName: "CrewPlay 場主刊登費",
      tradeDesc: `CrewPlay 場地刊登 ${record.venue_name}`.slice(0, 200),
      returnUrl: `${base}/api/payment/ecpay/notify`,
      orderResultUrl: `${base}/join/result?kind=venue&status=ok&tradeNo=${merchantTradeNo}`,
      clientBackUrl: `${base}/join/venue`,
    });

    return NextResponse.json({ ok: true, id: record.id, checkout, platformFee });
  } catch (err) {
    const message = err instanceof Error ? err.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
