import { NextResponse } from "next/server";

import { createBooking } from "@/lib/bookings";

import { sendBookingPendingEmails } from "@/lib/email";

import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

import { getPaymentProvider } from "@/lib/payment";



function siteUrl() {

  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

}



function tradeNo() {

  const t = Date.now().toString(36).toUpperCase();

  return `CP${t}`.slice(0, 20);

}



export async function POST(req: Request) {

  try {

    const body = await req.json();

    const teamId = String(body.team_id ?? "");

    const guestName = String(body.guest_name ?? "").trim();

    const guestPhone = String(body.guest_phone ?? "").trim();

    const guestEmail = String(body.guest_email ?? "").trim();



    if (!guestName || !guestPhone) {

      return NextResponse.json({ error: "請填寫姓名與手機" }, { status: 400 });

    }

    if (!guestEmail || !guestEmail.includes("@")) {

      return NextResponse.json({ error: "請填寫有效的 Email（用於寄送預約通知）" }, { status: 400 });

    }



    const team = await getTeamById(teamId);

    if (!team) return NextResponse.json({ error: "找不到揪團" }, { status: 404 });



    const enriched = enrichTeamFromIntro(team);

    const slots = Math.min(10, Math.max(1, parseInt(String(body.slots ?? 1), 10)));

    const unit = enriched.fee_amount ?? 200;

    const amount = body.amount ? parseInt(String(body.amount), 10) : unit * slots;

    const merchantTradeNo = tradeNo();



    const booking = await createBooking({

      team_id: team.id,

      guest_name: guestName,

      guest_phone: guestPhone,

      guest_email: guestEmail,

      slots,

      amount,

      merchant_trade_no: merchantTradeNo,

      note: String(body.note ?? ""),

    });



    await sendBookingPendingEmails({

      booking,

      team: {

        arena_name: enriched.arena_name,

        sport: enriched.sport,

        region: enriched.region,

        location: enriched.location,

      },

    });



    const provider = getPaymentProvider();

    const base = siteUrl();

    const checkout = provider.createCheckoutForm({

      merchantTradeNo,

      amount,

      itemName: enriched.arena_name.slice(0, 50),

      tradeDesc: `CrewPlay ${enriched.sport} 揪團`,

      returnUrl: `${base}/api/payment/ecpay/notify`,

      orderResultUrl: `${base}/book/result?status=ok&tradeNo=${merchantTradeNo}`,

      clientBackUrl: `${base}/teams/${team.id}`,

    });



    return NextResponse.json({ booking, checkout });

  } catch (e) {

    return NextResponse.json(

      { error: e instanceof Error ? e.message : "建立失敗" },

      { status: 500 }

    );

  }

}


