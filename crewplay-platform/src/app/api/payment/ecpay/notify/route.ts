import { NextResponse } from "next/server";

import { getBookingByTradeNo, markBookingPaid } from "@/lib/bookings";
import { sendBookingPaidEmails, sendHostFormEmails, sendVenueFormEmails } from "@/lib/email";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";
import { getPaymentProvider } from "@/lib/payment";
import {
  getHostByTradeNo,
  getVenueByTradeNo,
  markHostPaid,
  markVenuePaid,
} from "@/lib/submissions";

async function notifyBookingPaid(tradeNo: string) {
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

async function notifyHostPaid(tradeNo: string) {
  const existing = await getHostByTradeNo(tradeNo);
  if (!existing || existing.payment_status === "paid") return;

  const paid = await markHostPaid(tradeNo);
  if (!paid) return;

  await sendHostFormEmails({
    id: paid.id,
    submitted_at: paid.submitted_at,
    sport: paid.sport,
    location: paid.location,
    weekday: paid.weekday,
    time_slots: paid.time_slots,
    fee: paid.fee,
    skill_level: paid.skill_level,
    team_name: paid.team_name,
    equipment: paid.equipment,
    balls: paid.balls,
    phone: paid.phone,
    email: paid.email,
  });
}

async function notifyVenuePaid(tradeNo: string) {
  const existing = await getVenueByTradeNo(tradeNo);
  if (!existing || existing.payment_status === "paid") return;

  const paid = await markVenuePaid(tradeNo);
  if (!paid) return;

  await sendVenueFormEmails({
    id: paid.id,
    submitted_at: paid.submitted_at,
    venue_name: paid.venue_name,
    address: paid.address,
    price: paid.price,
    phone: paid.phone,
    line_id: paid.line_id,
    capacity: paid.capacity,
    court_count: paid.court_count,
    time_slots: paid.time_slots,
  });
}

async function notifyPaid(tradeNo: string) {
  if (tradeNo.startsWith("CH")) {
    await notifyHostPaid(tradeNo);
    return;
  }
  if (tradeNo.startsWith("CV")) {
    await notifyVenuePaid(tradeNo);
    return;
  }
  await notifyBookingPaid(tradeNo);
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
      console.error("Payment notify handler failed:", err);
    }
  }

  return new NextResponse("1|OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
