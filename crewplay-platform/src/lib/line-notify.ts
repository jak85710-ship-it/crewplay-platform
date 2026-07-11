import { bookingReference } from "@/lib/booking-ref";
import { checkInPassUrl, hostCheckInPortalUrl } from "@/lib/check-in-url";
import { issueCheckInToken } from "@/lib/check-in-token";
import { issueHostPortalToken } from "@/lib/host-portal-token";
import { getLineHostRecipientsConfig } from "@/lib/line-host-recipients";
import { getPublicSiteUrl } from "@/lib/line-auth";
import { parseIntroField } from "@/lib/utils";
import { extractVolleyballPositionFromNote } from "@/lib/volleyball-position";

type LineTextMessage = {
  type: "text";
  text: string;
};

type LinePushResult = {
  sent: boolean;
  reason?: string;
};

type LineNotifyStatus = {
  configured: boolean;
  enabled: boolean;
  guest: LinePushResult;
  host: LinePushResult;
};

type TeamLite = {
  id: string;
  arena_name: string;
  introduce?: string;
  location?: string;
};

type BookingLite = {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  slots: number;
  note?: string;
  line_uid?: string | null;
  merchant_trade_no?: string | null;
};

function lineNotifyEnabled(): boolean {
  return String(process.env.LINE_NOTIFY_ENABLED || "").trim().toLowerCase() === "true";
}

function lineMessagingToken(): string {
  return String(process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || "").trim();
}

function isLinePushConfigured(): boolean {
  return Boolean(lineMessagingToken());
}

function splitRecipients(raw: string | undefined): string[] {
  return String(raw || "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function resolveHostRecipientsByTeam(teamId: string): Promise<string[]> {
  const globalRecipients = splitRecipients(process.env.LINE_NOTIFY_HOST_UIDS);
  const byTeamRaw = String(process.env.LINE_NOTIFY_HOST_UIDS_BY_TEAM || "").trim();

  const fromEnv = (): string[] => {
    if (!byTeamRaw) return globalRecipients;

    try {
      const parsed = JSON.parse(byTeamRaw) as Record<string, string | string[]>;
      const picked = parsed[teamId];
      const teamRecipients = Array.isArray(picked)
        ? picked.map((v) => String(v).trim()).filter(Boolean)
        : picked
          ? [String(picked).trim()]
          : [];
      return [...new Set([...teamRecipients, ...globalRecipients])];
    } catch {
      return globalRecipients;
    }
  };

  try {
    const config = await getLineHostRecipientsConfig();
    const runtimeTeam = Array.isArray(config.byTeam?.[teamId]) ? config.byTeam[teamId] : [];
    const runtimeGlobal = Array.isArray(config.globalRecipients) ? config.globalRecipients : [];
    const runtimeRecipients = [...new Set([...runtimeTeam, ...runtimeGlobal].map((v) => String(v).trim()).filter(Boolean))];
    if (runtimeRecipients.length) return runtimeRecipients;
    return fromEnv();
  } catch {
    return fromEnv();
  }
}

async function pushLineMessage(to: string, messages: LineTextMessage[]): Promise<LinePushResult> {
  const token = lineMessagingToken();
  if (!token) return { sent: false, reason: "line_token_missing" };

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { sent: false, reason: `line_push_failed:${res.status}:${err.slice(0, 200)}` };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "line_push_error",
    };
  }
}

export async function pushLineTextToRecipients(input: {
  recipients: string[];
  text: string;
}): Promise<{
  total: number;
  success: number;
  failed: number;
  failedReasons: string[];
}> {
  const recipients = [...new Set(input.recipients.map((v) => String(v || "").trim()).filter(Boolean))];
  if (!recipients.length) {
    return { total: 0, success: 0, failed: 0, failedReasons: ["no_recipients"] };
  }
  const results = await Promise.all(
    recipients.map((uid) => pushLineMessage(uid, [{ type: "text", text: input.text }]))
  );
  const success = results.filter((r) => r.sent).length;
  const failedReasons = results.filter((r) => !r.sent).map((r) => r.reason || "unknown_error");
  return {
    total: recipients.length,
    success,
    failed: recipients.length - success,
    failedReasons,
  };
}

function guestMessage(booking: BookingLite, team: TeamLite): LineTextMessage[] {
  const ref = bookingReference(booking);
  const checkInToken = issueCheckInToken(booking);
  const checkInUrl = checkInToken ? checkInPassUrl(checkInToken) : "";
  const myBookingsUrl = `${getPublicSiteUrl()}/my/bookings`;
  const timeText = parseIntroField(team.introduce || "", "時間");
  const placeText = parseIntroField(team.introduce || "", "地點") || team.location || "";
  const positionMeta = extractVolleyballPositionFromNote(booking.note);

  const text = [
    "【CrewPlay】報名成功",
    `報名編號：${ref}`,
    `揪團：${team.arena_name}`,
    `人數：${booking.slots} 人`,
    positionMeta.position ? `擅長位置：${positionMeta.position}` : "",
    timeText ? `時間：${timeText}` : "",
    placeText ? `地點：${placeText}` : "",
    "",
    `我的預約：${myBookingsUrl}`,
    checkInUrl ? `進場 QR：${checkInUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [{ type: "text", text }];
}

function hostMessage(booking: BookingLite, team: TeamLite): LineTextMessage[] {
  const ref = bookingReference(booking);
  const portalToken = issueHostPortalToken(team.id);
  const portalUrl = portalToken ? hostCheckInPortalUrl(portalToken) : "";
  const timeText = parseIntroField(team.introduce || "", "時間");
  const placeText = parseIntroField(team.introduce || "", "地點") || team.location || "";
  const positionMeta = extractVolleyballPositionFromNote(booking.note);

  const text = [
    "【CrewPlay】有新球友報名",
    `揪團：${team.arena_name}`,
    `報名編號：${ref}`,
    `報名者：${booking.guest_name}`,
    `手機：${booking.guest_phone}`,
    booking.guest_email ? `Email：${booking.guest_email}` : "",
    `人數：${booking.slots} 人`,
    positionMeta.position ? `擅長位置：${positionMeta.position}` : "",
    positionMeta.detail ? `位置補充：${positionMeta.detail}` : "",
    timeText ? `時間：${timeText}` : "",
    placeText ? `地點：${placeText}` : "",
    "",
    portalUrl ? `團主掃碼入口：${portalUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [{ type: "text", text }];
}

export async function notifyBookingCreatedLine(input: {
  booking: BookingLite;
  team: TeamLite;
}): Promise<LineNotifyStatus> {
  const base: LineNotifyStatus = {
    configured: isLinePushConfigured(),
    enabled: lineNotifyEnabled(),
    guest: { sent: false, reason: "skipped" },
    host: { sent: false, reason: "skipped" },
  };

  if (!base.enabled) return base;
  if (!base.configured) {
    return {
      ...base,
      guest: { sent: false, reason: "line_not_configured" },
      host: { sent: false, reason: "line_not_configured" },
    };
  }

  const guestUid = String(input.booking.line_uid || "").trim();
  if (guestUid) {
    base.guest = await pushLineMessage(guestUid, guestMessage(input.booking, input.team));
  } else {
    base.guest = { sent: false, reason: "guest_line_uid_missing" };
  }

  const hostRecipients = await resolveHostRecipientsByTeam(input.team.id);
  if (!hostRecipients.length) {
    base.host = { sent: false, reason: "host_line_uid_missing" };
    return base;
  }

  const hostResults = await Promise.all(
    hostRecipients.map((uid) => pushLineMessage(uid, hostMessage(input.booking, input.team)))
  );
  const hostSuccess = hostResults.some((r) => r.sent);
  base.host = hostSuccess
    ? { sent: true }
    : { sent: false, reason: hostResults.map((r) => r.reason || "unknown").join(";") };

  return base;
}
