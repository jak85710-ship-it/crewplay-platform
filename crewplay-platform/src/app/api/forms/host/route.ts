import { NextResponse } from "next/server";

import { type HostSubmission } from "@/lib/email";
import { getJoinHostFee } from "@/lib/join-fees";
import { getPaymentProvider } from "@/lib/payment";
import { siteUrl } from "@/lib/payment/site-url";
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

    const platformFee = getJoinHostFee();
    const merchantTradeNo = createTradeNo("CH");

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
    };

    await saveHostSubmission(record, merchantTradeNo, platformFee);

    const provider = getPaymentProvider();
    const base = siteUrl();
    const checkout = provider.createCheckoutForm({
      merchantTradeNo,
      amount: platformFee,
      itemName: "CrewPlay 團主開團刊登費",
      tradeDesc: `CrewPlay 團主開團 ${record.team_name}`.slice(0, 200),
      returnUrl: `${base}/api/payment/ecpay/notify`,
      orderResultUrl: `${base}/join/result?kind=host&status=ok&tradeNo=${merchantTradeNo}`,
      clientBackUrl: `${base}/join/host`,
    });

    return NextResponse.json({ ok: true, id: record.id, checkout, platformFee });
  } catch (err) {
    const message = err instanceof Error ? err.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
