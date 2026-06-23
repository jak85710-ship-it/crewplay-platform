import { NextResponse } from "next/server";

import { getBookingByTradeNo, markBookingPaid } from "@/lib/bookings";

import { sendBookingPaidEmails } from "@/lib/email";

import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

import { getPaymentProvider } from "@/lib/payment";



async function notifyPaid(tradeNo: string) {

  const booking = await getBookingByTradeNo(tradeNo);

  if (!booking || booking.status === "paid") return;



  await markBookingPaid(tradeNo);

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



export async function POST(req: Request) {

  const form = await req.formData();

  const payload: Record<string, string> = {};

  form.forEach((v, k) => {

    payload[k] = String(v);

  });



  const provider = getPaymentProvider();

  const result = provider.verifyWebhook(payload);



  if (result.valid && result.paid) {

    try {

      await notifyPaid(result.tradeNo);

    } catch (err) {

      console.error("Booking paid email failed:", err);

    }

  }



  return new NextResponse("1|OK", {

    status: 200,

    headers: { "Content-Type": "text/plain" },

  });

}


