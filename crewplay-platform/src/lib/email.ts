import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import { bookingReference } from "@/lib/booking-ref";
import { hostCheckInPortalUrl } from "@/lib/check-in-url";
import { issueHostPortalToken } from "@/lib/host-portal-token";
import { submissionImagePublicUrl } from "@/lib/submission-images";
import { feeSummary, parseIntroField } from "@/lib/utils";

const DEFAULT_GMAIL = "crew.matchplay@gmail.com";
const DEFAULT_NOTIFY_TO = "crew.matchplay@gmail.com";

type MailConfig = {
  user: string;
  pass: string;
  notifyTo: string;
};

let transporter: Transporter | null = null;

function getMailConfig(): MailConfig | null {
  const user = process.env.GMAIL_USER || DEFAULT_GMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!pass) return null;
  return {
    user,
    pass,
    notifyTo: process.env.GMAIL_NOTIFY_TO || DEFAULT_NOTIFY_TO,
  };
}

function notifyRecipients(notifyTo: string): string[] {
  return notifyTo
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

function getTransporter(): Transporter {
  const cfg = getMailConfig();
  if (!cfg) {
    throw new Error("Gmail 尚未設定：請在 .env.local 填入 GMAIL_APP_PASSWORD");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return transporter;
}

function lines(entries: [string, string][]): string {
  return entries.map(([k, v]) => `${k}：${v}`).join("\n");
}

export type HostSubmission = {
  id: string;
  submitted_at: string;
  sport: string;
  location: string;
  weekday: string;
  time_slots: string[];
  fee: string;
  skill_level: string;
  team_name: string;
  equipment: string;
  balls: string;
  phone: string;
  email: string;
  trust_image_id?: string;
};

export type VenueSubmission = {
  id: string;
  submitted_at: string;
  venue_name: string;
  address: string;
  price: string;
  phone: string;
  line_id: string;
  capacity: string;
  court_count: string;
  time_slots: string[];
  trust_image_id?: string;
};

function trustImageLine(data: { trust_image_id?: string }): [string, string] | null {
  if (!data.trust_image_id) return null;
  return ["團隊／場地照片", submissionImagePublicUrl(data.trust_image_id)];
}

function hostInternalBody(data: HostSubmission): string {
  const rows: [string, string][] = [
      ["從事的運動項目", data.sport],
      ["想揪團運動的地點", data.location],
      ["每周固定約運動的時間", data.weekday],
      ["想運動的時段", data.time_slots.join("、")],
      ["想收取多少團費", data.fee],
      ["想找的程度為", data.skill_level],
      ["團隊名稱", data.team_name],
      ["需自備器材", data.equipment],
      ["提供用球為", data.balls],
      ["電話號碼", data.phone],
      ["電子郵件", data.email],
    ];
  const imageLine = trustImageLine(data);
  if (imageLine) rows.push(imageLine);

  return [
    "【團主開團】新申請",
    `申請編號：${data.id}`,
    `提交時間：${data.submitted_at}`,
    "",
    lines(rows),
  ].join("\n");
}

function hostCustomerBody(data: HostSubmission): string {
  return [
    `${data.team_name || "您好"}，`,
    "",
    "感謝您透過 CrewPlay運動媒合平台 提交「我要開團」申請，我們已收到您的資料：",
    "",
    lines([
      ["從事的運動項目", data.sport],
      ["想揪團運動的地點", data.location],
      ["每周固定約運動的時間", data.weekday],
      ["想運動的時段", data.time_slots.join("、")],
      ["想收取多少團費", data.fee],
      ["想找的程度為", data.skill_level],
      ["團隊名稱", data.team_name],
      ["需自備器材", data.equipment],
      ["提供用球為", data.balls],
      ["電話號碼", data.phone],
    ]),
    "",
    `申請編號：${data.id}`,
    "",
    "我們將依序審核並為您媒合，媒合成功後會再次以 Email 通知。",
    "如有疑問，請直接回信至本信箱，或致電 07-552-2092。",
    "",
    "CrewPlay運動媒合平台",
    "crew.matchplay@gmail.com",
  ].join("\n");
}

function venueInternalBody(data: VenueSubmission): string {
  const rows: [string, string][] = [
      ["場館名稱", data.venue_name],
      ["場館地址", data.address],
      ["場租價格", data.price],
      ["連絡電話", data.phone],
      ["LINE ID", data.line_id],
      ["場館預計單一時段租借多少人次", data.capacity],
      ["場地預計出借幾塊場地", data.court_count],
      ["場館開放預約時間", data.time_slots.join("、")],
    ];
  const imageLine = trustImageLine(data);
  if (imageLine) rows.push(imageLine);

  return [
    "【場主刊登】新申請",
    `申請編號：${data.id}`,
    `提交時間：${data.submitted_at}`,
    "",
    lines(rows),
    "",
    "（此表單未填 Email，請以電話或 LINE 聯繫場主）",
  ].join("\n");
}

async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}) {
  const cfg = getMailConfig();
  if (!cfg) throw new Error("Gmail 尚未設定：請在 .env.local 填入 GMAIL_APP_PASSWORD");

  await getTransporter().sendMail({
    from: `CrewPlay運動媒合平台 <${cfg.user}>`,
    to: opts.to,
    replyTo: opts.replyTo || cfg.user,
    subject: opts.subject,
    text: opts.text,
  });
}

/** 1) 通知 CREW 信箱  2) 自動回覆團主 Email */
export async function sendHostFormEmails(data: HostSubmission) {
  const cfg = getMailConfig();
  if (!cfg) throw new Error("Gmail 尚未設定：請在 .env.local 填入 GMAIL_APP_PASSWORD");

  await sendMail({
    to: cfg.notifyTo,
    subject: `[開團申請] ${data.team_name}（${data.id.slice(0, 8)}）`,
    text: hostInternalBody(data),
    replyTo: data.email,
  });

  await sendMail({
    to: data.email,
    subject: `[CrewPlay] 已收到您的開團申請（${data.id.slice(0, 8)}）`,
    text: hostCustomerBody(data),
  });
}

export async function sendVenueFormEmails(data: VenueSubmission) {
  const cfg = getMailConfig();
  if (!cfg) throw new Error("Gmail 尚未設定：請在 .env.local 填入 GMAIL_APP_PASSWORD");

  await sendMail({
    to: cfg.notifyTo,
    subject: `[場地刊登] ${data.venue_name}（${data.id.slice(0, 8)}）`,
    text: venueInternalBody(data),
  });
}

export function isEmailConfigured(): boolean {
  return getMailConfig() !== null;
}

export async function sendLoginOtpEmail(
  to: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const cfg = getMailConfig();
    if (!cfg) return { ok: false, error: "email_not_configured" };
    const transport = getTransporter();
    await transport.sendMail({
      from: `CrewPlay <${cfg.user}>`,
      to,
      subject: `CrewPlay 登入驗證碼 ${code}`,
      text: [
        "您的 CrewPlay 登入驗證碼",
        "",
        code,
        "",
        "此驗證碼 5 分鐘內有效。",
        "如非本人操作，請忽略此信。",
      ].join("\n"),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send_failed" };
  }
}

export type BookingMailContext = {
  booking: {
    id: string;
    merchant_trade_no: string | null;
    guest_name: string;
    guest_phone: string;
    guest_email: string;
    slots: number;
    amount: number;
    note: string;
    created_at?: string;
    status?: string;
  };
  team: {
    id?: string;
    arena_name: string;
    sport: string;
    region: string;
    location: string;
    introduce?: string;
    fee_amount?: number | null;
    fee_label?: string;
  };
};

export type BookingEmailResult = {
  configured: boolean;
  adminNotified: boolean;
  guestNotified: boolean;
  error?: string;
};

function bookingLines(ctx: BookingMailContext, includeContact = true): string {
  const ref = bookingReference(ctx.booking);
  const rows: [string, string][] = [
    ["報名編號", ref],
    ["揪團名稱", ctx.team.arena_name],
    ["運動項目", ctx.team.sport],
    ["地區", ctx.team.region],
    ["地點", ctx.team.location || "—"],
    ["報名姓名", ctx.booking.guest_name],
    ["手機", ctx.booking.guest_phone],
    ["人數", String(ctx.booking.slots)],
    ["金額", `NT$ ${ctx.booking.amount}`],
  ];
  if (includeContact && ctx.booking.guest_email) {
    rows.splice(7, 0, ["Email", ctx.booking.guest_email]);
  }
  if (ctx.booking.note) rows.push(["備註", ctx.booking.note]);
  return lines(rows);
}

function findContactEmail(text: string | undefined): string | null {
  if (!text) return null;
  const labeled = text.match(/(?:Email|email|信箱|聯絡)[：:\s]*([^\s@]+@[^\s@]+\.[^\s@]+)/i);
  if (labeled?.[1]) return labeled[1].trim();
  const any = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  return any ? any[0].trim() : null;
}

/** 新預約（報名）：通知平台 + 回覆報名者（現場付費） */
export async function sendBookingSubmittedEmails(ctx: BookingMailContext): Promise<BookingEmailResult> {
  const cfg = getMailConfig();
  if (!cfg) {
    console.warn("Gmail not configured; skipping booking submitted emails");
    return { configured: false, adminNotified: false, guestNotified: false, error: "email_not_configured" };
  }

  const ref = bookingReference(ctx.booking);
  const hostPortalToken = ctx.team.id ? issueHostPortalToken(ctx.team.id) : "";
  const hostPortalLink = hostPortalToken ? hostCheckInPortalUrl(hostPortalToken) : "";
  const hostEmail = findContactEmail(ctx.team.introduce);
  const timeText = parseIntroField(ctx.team.introduce ?? "", "時間");
  const placeText =
    parseIntroField(ctx.team.introduce ?? "", "地點") || ctx.team.location || "—";
  const feeText = feeSummary({
    fee_amount: ctx.team.fee_amount ?? null,
    fee_label: ctx.team.fee_label ?? "",
    introduce: ctx.team.introduce ?? "",
  });

  try {
    const adminBody = [
      "【揪團查詢】新預約報名（現場付費）",
      `提交時間：${ctx.booking.created_at ?? new Date().toISOString()}`,
      "",
      bookingLines(ctx),
      "",
      timeText ? `時間：${timeText}` : "",
      placeText ? `地點：${placeText}` : "",
      "",
      hostPortalLink ? `團主進場核銷（掃碼）：${hostPortalLink}` : "",
      "",
      "團費請報名者到場向團主繳交，平台不代收揪團費用。",
    ]
      .filter(Boolean)
      .join("\n");

    for (const to of notifyRecipients(cfg.notifyTo)) {
      await sendMail({
        to,
        subject: `[揪團預約] ${ctx.team.arena_name}（${ref}）`,
        text: adminBody,
        replyTo: ctx.booking.guest_email || undefined,
      });
    }

    let guestNotified = false;
    if (ctx.booking.guest_email) {
      await sendMail({
        to: ctx.booking.guest_email,
        subject: `[CrewPlay] 報名成功 — ${ctx.team.arena_name}（${ref}）`,
        text: [
          `${ctx.booking.guest_name} 您好，`,
          "",
          "您已在 CrewPlay 運動媒合平台完成揪團報名，名額已為您保留。",
          `您的報名編號：${ref}（洽詢客服或查詢預約時請提供此編號）`,
          "",
          "到場請開啟「我的預約」出示 QR Code 給團主掃描，無需自行操作核銷。",
          "",
          "【報名資訊】",
          bookingLines(ctx, true),
          "",
          "【下一步】",
          "1. 已為您保留名額",
          timeText ? `2. 請準時到場：${timeText}` : "2. 請準時到場（時間請見揪團說明）",
          placeText ? `   地點：${placeText}` : "",
          feeText ? `3. 到場向團主付費（免預付）：${feeText}` : "3. 到場向團主付費（免預付）",
          "",
          "團主將透過您留的手機與 Email 聯絡。如有問題請致電 07-552-2092 或回信本信箱。",
          "",
          "CrewPlay 運動媒合平台",
          "crew.matchplay@gmail.com",
        ]
          .filter(Boolean)
          .join("\n"),
        replyTo: cfg.user,
      });
      guestNotified = true;
    }

    if (hostPortalLink) {
      const hostBody = [
        "【團主進場核銷】有新球友報名",
        "",
        `揪團：${ctx.team.arena_name}`,
        `報名編號：${ref}`,
        `報名者：${ctx.booking.guest_name} · ${ctx.booking.guest_phone}`,
        ctx.booking.guest_email ? `Email：${ctx.booking.guest_email}` : "",
        timeText ? `時間：${timeText}` : "",
        placeText ? `地點：${placeText}` : "",
        "",
        "請使用手機開啟以下連結，以 LINE 登入後掃描球友 QR Code 完成進場核銷：",
        hostPortalLink,
        "",
        "球友會在「我的預約」出示 QR Code，請在現場掃描即可。",
      ]
        .filter(Boolean)
        .join("\n");

      const hostRecipients = hostEmail ? [hostEmail] : notifyRecipients(cfg.notifyTo);
      for (const to of hostRecipients) {
        await sendMail({
          to,
          subject: `[CrewPlay 進場核銷] ${ctx.team.arena_name} 新報名（${ref}）`,
          text: hostBody,
          replyTo: cfg.user,
        });
      }
    }

    return { configured: true, adminNotified: true, guestNotified };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send_failed";
    console.error("booking email failed:", message);
    return { configured: true, adminNotified: false, guestNotified: false, error: message };
  }
}

/** @deprecated 舊版待付款流程，保留給歷史訂單 */
export async function sendBookingPendingEmails(ctx: BookingMailContext) {
  return sendBookingSubmittedEmails(ctx);
}

/** 付款成功：通知您 + 回覆報名者 */
export async function sendBookingPaidEmails(ctx: BookingMailContext) {
  const cfg = getMailConfig();
  if (!cfg) {
    console.warn("Gmail not configured; skipping booking paid emails");
    return;
  }

  const ref = bookingReference(ctx.booking);

  await sendMail({
    to: cfg.notifyTo,
    subject: `[揪團預約·已付款] ${ctx.team.arena_name}（${ref}）`,
    text: ["【揪團查詢】預約已付款", "", bookingLines(ctx)].join("\n"),
    replyTo: ctx.booking.guest_email || undefined,
  });

  if (ctx.booking.guest_email) {
    await sendMail({
      to: ctx.booking.guest_email,
      subject: `[CrewPlay] 付款成功，預約已確認（${ref}）`,
      text: [
        `${ctx.booking.guest_name} 您好，`,
        "",
        "您的揪團預約已付款成功：",
        `您的報名編號：${ref}`,
        "",
        bookingLines(ctx, true),
        "",
        "團主將與您聯繫確認細節。如有問題請致電 07-552-2092。",
        "",
        "CrewPlay運動媒合平台",
      ].join("\n"),
      replyTo: cfg.user,
    });
  }
}
