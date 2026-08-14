import { NextResponse } from "next/server";

import { sendHostFormEmails, type HostSubmission } from "@/lib/email";
import { HOST_TIME_SLOTS, SKILL_LEVELS, WEEKDAYS } from "@/lib/form-options";
import { checkAndRecordHostSubmitGuard } from "@/lib/form-abuse-guard";
import { siteUrl } from "@/lib/payment/site-url";
import { normalizePhone } from "@/lib/phone-auth";
import { hasSubmissionImage } from "@/lib/submission-images";
import { createTradeNo, saveHostSubmission } from "@/lib/submissions";

function missing(body: Record<string, unknown>, keys: string[]) {
  return keys.filter((k) => {
    const v = body[k];
    if (Array.isArray(v)) return v.length === 0;
    return v === undefined || v === null || String(v).trim() === "";
  });
}

function text(value: unknown, maxLen: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function looksSpammy(value: string): boolean {
  if (!value) return true;
  if (/(https?:\/\/|www\.)/i.test(value)) return true;
  if (/(.)\1{6,}/.test(value)) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const required = [
      "sport",
      "location",
      "weekday",
      "time_slots",
      "vacancies",
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

    const honeypot = text(body.company_website ?? body.website ?? "", 120);
    const sport = text(body.sport, 30);
    const location = text(body.location, 120);
    const weekday = text(body.weekday, 20);
    const vacanciesRaw = text(body.vacancies, 10);
    const fee = text(body.fee, 80);
    const skillLevel = text(body.skill_level, 30);
    const teamName = text(body.team_name, 40);
    const equipment = text(body.equipment, 80);
    const balls = text(body.balls, 80);
    const phoneRaw = text(body.phone, 30);
    const email = text(body.email, 80).toLowerCase();
    const timeSlots = Array.isArray(body.time_slots)
      ? [...new Set(body.time_slots.map((s) => text(s, 20)).filter(Boolean))]
      : [];
    const trustImageId = text(body.trust_image_id, 80);

    if (!WEEKDAYS.includes(weekday as (typeof WEEKDAYS)[number])) {
      return NextResponse.json({ error: "固定日期格式錯誤，請重新選擇" }, { status: 400 });
    }
    if (!SKILL_LEVELS.includes(skillLevel as (typeof SKILL_LEVELS)[number])) {
      return NextResponse.json({ error: "程度欄位格式錯誤，請重新選擇" }, { status: 400 });
    }
    if (!timeSlots.length || timeSlots.some((slot) => !HOST_TIME_SLOTS.includes(slot as (typeof HOST_TIME_SLOTS)[number]))) {
      return NextResponse.json({ error: "時段欄位格式錯誤，請重新選擇" }, { status: 400 });
    }

    const vacancies = Number(vacanciesRaw);
    if (!Number.isInteger(vacancies) || vacancies <= 0 || vacancies > 100) {
      return NextResponse.json({ error: "缺額人數請填 1~100 的整數" }, { status: 400 });
    }

    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      return NextResponse.json({ error: "請填寫有效手機號碼（09 開頭，10 碼）" }, { status: 400 });
    }
    if (!validEmail(email)) {
      return NextResponse.json({ error: "請填寫有效 Email" }, { status: 400 });
    }

    for (const [label, value] of [
      ["運動項目", sport],
      ["地點", location],
      ["團隊名稱", teamName],
      ["器材", equipment],
      ["用球", balls],
    ] as const) {
      if (looksSpammy(value)) {
        return NextResponse.json({ error: `${label}內容異常，請重新填寫` }, { status: 400 });
      }
    }

    const guard = await checkAndRecordHostSubmitGuard({
      req,
      honeypot,
      fingerprint: [
        teamName.toLowerCase(),
        email,
        phone,
        location.toLowerCase(),
        weekday,
        timeSlots.join(","),
      ].join("|"),
    });
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    if (!trustImageId) {
      return NextResponse.json({ error: "請上傳團隊照片" }, { status: 400 });
    }
    if (!/^host-[0-9a-f-]{36}$/i.test(trustImageId)) {
      return NextResponse.json({ error: "團隊照片識別碼格式錯誤，請重新上傳" }, { status: 400 });
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
      sport,
      location,
      weekday,
      time_slots: timeSlots,
      vacancies: String(vacancies),
      fee,
      skill_level: skillLevel,
      team_name: teamName,
      equipment,
      balls,
      phone,
      email,
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
