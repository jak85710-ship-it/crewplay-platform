import { NextResponse } from "next/server";

import { sendVenueDeviceConsultingEmails } from "@/lib/email";
import {
  saveVenueDeviceConsultingSubmission,
  type VenueDeviceConsultingSubmission,
} from "@/lib/venue-device-consulting";

function toList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v || "").trim()).filter(Boolean))];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "請提供諮詢內容" }, { status: 400 });
    }

    const venueName = String(body.venue_name || "").trim();
    const venueAddress = String(body.venue_address || "").trim();
    const contactNameTitle = String(body.contact_name_title || "").trim();
    const contactPhone = String(body.contact_phone || "").trim();
    const contactEmail = String(body.contact_email || "").trim();
    const sports = toList(body.sports);
    const devices = toList(body.devices);
    const goals = toList(body.goals);
    const painPoints = toList(body.pain_points);
    const consultMethods = toList(body.consult_methods);
    const preferredSlots = toList(body.preferred_slots);
    const networkReadyRaw = String(body.network_ready || "").trim();
    const networkReady: "是" | "否" = networkReadyRaw === "否" ? "否" : "是";

    if (!venueName || !venueAddress || !contactNameTitle || !contactPhone || !contactEmail) {
      return NextResponse.json({ error: "請完整填寫場地與聯絡資訊" }, { status: 400 });
    }
    if (!contactEmail.includes("@")) {
      return NextResponse.json({ error: "請填寫有效 Email" }, { status: 400 });
    }
    if (!sports.length) {
      return NextResponse.json({ error: "請至少選擇一項運動項目" }, { status: 400 });
    }
    if (!devices.length) {
      return NextResponse.json({ error: "請至少選擇一項希望串接的硬體設備" }, { status: 400 });
    }
    if (!goals.length) {
      return NextResponse.json({ error: "請至少選擇一項核心功能目標" }, { status: 400 });
    }
    if (!painPoints.length) {
      return NextResponse.json({ error: "請至少選擇一項目前痛點" }, { status: 400 });
    }
    if (!consultMethods.length) {
      return NextResponse.json({ error: "請至少選擇一項諮詢方式" }, { status: 400 });
    }
    if (!preferredSlots.length) {
      return NextResponse.json({ error: "請至少選擇一個方便諮詢時段" }, { status: 400 });
    }

    const record: VenueDeviceConsultingSubmission = {
      id: crypto.randomUUID(),
      submitted_at: new Date().toISOString(),
      venue_name: venueName,
      venue_address: venueAddress,
      contact_name_title: contactNameTitle,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      sports,
      devices,
      network_ready: networkReady,
      goals,
      pain_points: painPoints,
      consult_methods: consultMethods,
      preferred_slots: preferredSlots,
    };

    try {
      await saveVenueDeviceConsultingSubmission(record);
    } catch (saveErr) {
      console.error("saveVenueDeviceConsultingSubmission failed:", saveErr);
    }
    try {
      await sendVenueDeviceConsultingEmails(record);
    } catch (mailErr) {
      console.error("sendVenueDeviceConsultingEmails failed:", mailErr);
    }

    return NextResponse.json({ ok: true, id: record.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
