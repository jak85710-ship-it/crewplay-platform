import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const DEFAULT_GMAIL = "crew.matchplay@gmail.com";

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
    notifyTo: process.env.GMAIL_NOTIFY_TO || user,
  };
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
};

function hostInternalBody(data: HostSubmission): string {
  return [
    "【團主開團】新申請",
    `申請編號：${data.id}`,
    `提交時間：${data.submitted_at}`,
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
      ["電子郵件", data.email],
    ]),
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
  return [
    "【場主刊登】新申請",
    `申請編號：${data.id}`,
    `提交時間：${data.submitted_at}`,
    "",
    lines([
      ["場館名稱", data.venue_name],
      ["場館地址", data.address],
      ["場租價格", data.price],
      ["連絡電話", data.phone],
      ["LINE ID", data.line_id],
      ["場館預計單一時段租借多少人次", data.capacity],
      ["場地預計出借幾塊場地", data.court_count],
      ["場館開放預約時間", data.time_slots.join("、")],
    ]),
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
    arena_name: string;
    sport: string;
    region: string;
    location: string;
  };
};

function bookingLines(ctx: BookingMailContext, includeContact = true): string {
  const rows: [string, string][] = [
    ["揪團名稱", ctx.team.arena_name],
    ["運動項目", ctx.team.sport],
    ["地區", ctx.team.region],
    ["地點", ctx.team.location || "—"],
    ["報名姓名", ctx.booking.guest_name],
    ["手機", ctx.booking.guest_phone],
    ["人數", String(ctx.booking.slots)],
    ["金額", `NT$ ${ctx.booking.amount}`],
    ["訂單編號", ctx.booking.merchant_trade_no || "—"],
  ];
  if (includeContact && ctx.booking.guest_email) {
    rows.splice(6, 0, ["Email", ctx.booking.guest_email]);
  }
  if (ctx.booking.note) rows.push(["備註", ctx.booking.note]);
  return lines(rows);
}

/** 新預約（待付款）：通知您 + 回覆報名者 */
export async function sendBookingPendingEmails(ctx: BookingMailContext) {
  const cfg = getMailConfig();
  if (!cfg) throw new Error("Gmail 尚未設定：請在 .env.local 填入 GMAIL_APP_PASSWORD");

  const trade = ctx.booking.merchant_trade_no?.slice(0, 12) ?? ctx.booking.id.slice(0, 8);

  await sendMail({
    to: cfg.notifyTo,
    subject: `[揪團預約·待付款] ${ctx.team.arena_name}（${trade}）`,
    text: [
      "【揪團查詢】新預約（待付款）",
      `提交時間：${ctx.booking.created_at ?? new Date().toISOString()}`,
      "",
      bookingLines(ctx),
      "",
      "付款完成後系統會再寄一封「已付款」通知。",
    ].join("\n"),
    replyTo: ctx.booking.guest_email || undefined,
  });

  if (ctx.booking.guest_email) {
    await sendMail({
      to: ctx.booking.guest_email,
      subject: `[CrewPlay] 預約已建立，請完成付款（${trade}）`,
      text: [
        `${ctx.booking.guest_name} 您好，`,
        "",
        "您已在 CrewPlay運動媒合平台提交揪團預約，請於付款頁完成金流：",
        "",
        bookingLines(ctx, false),
        "",
        "若已完成付款但未收到確認，請回信至 crew.matchplay@gmail.com 並提供訂單編號。",
        "",
        "CrewPlay運動媒合平台",
      ].join("\n"),
    });
  }
}

/** 付款成功：通知您 + 回覆報名者 */
export async function sendBookingPaidEmails(ctx: BookingMailContext) {
  const cfg = getMailConfig();
  if (!cfg) throw new Error("Gmail 尚未設定：請在 .env.local 填入 GMAIL_APP_PASSWORD");

  const trade = ctx.booking.merchant_trade_no?.slice(0, 12) ?? ctx.booking.id.slice(0, 8);

  await sendMail({
    to: cfg.notifyTo,
    subject: `[揪團預約·已付款] ${ctx.team.arena_name}（${trade}）`,
    text: ["【揪團查詢】預約已付款", "", bookingLines(ctx)].join("\n"),
    replyTo: ctx.booking.guest_email || undefined,
  });

  if (ctx.booking.guest_email) {
    await sendMail({
      to: ctx.booking.guest_email,
      subject: `[CrewPlay] 付款成功，預約已確認（${trade}）`,
      text: [
        `${ctx.booking.guest_name} 您好，`,
        "",
        "您的揪團預約已付款成功：",
        "",
        bookingLines(ctx, false),
        "",
        "團主將與您聯繫確認細節。如有問題請致電 07-552-2092。",
        "",
        "CrewPlay運動媒合平台",
      ].join("\n"),
    });
  }
}
