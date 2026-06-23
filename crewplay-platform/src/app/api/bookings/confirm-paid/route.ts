import { NextResponse } from "next/server";

import { getBookingByTradeNo, markBookingPaid } from "@/lib/bookings";

import { sendBookingPaidEmails } from "@/lib/email";

import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";



/** 使用者從 ECPay 返回結果頁時補發「已付款」通知（本機測試時 webhook 可能收不到） */

export async function POST(req: Request) {

  try {

    const { tradeNo } = await req.json();

    if (!tradeNo) {

      return NextResponse.json({ error: "缺少訂單編號" }, { status: 400 });

    }



    const booking = await getBookingByTradeNo(String(tradeNo));

    if (!booking) {

      return NextResponse.json({ error: "找不到預約" }, { status: 404 });

    }



    if (booking.status !== "paid") {

      await markBookingPaid(String(tradeNo));

      const team = await getTeamById(booking.team_id);

      const enriched = team ? enrichTeamFromIntro(team) : null;

      await sendBookingPaidEmails({

        booking: { ...booking, status: "paid" },

        team: {

          arena_name: enriched?.arena_name ?? "未知揪團",

          sport: enriched?.sport ?? "",

          region: enriched?.region ?? "",

          location: enriched?.location ?? "",

        },

      });

    }



    return NextResponse.json({ ok: true });

  } catch (e) {

    return NextResponse.json(

      { error: e instanceof Error ? e.message : "確認失敗" },

      { status: 500 }

    );

  }

}


