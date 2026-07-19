import crypto from "crypto";
import { NextResponse } from "next/server";

import { upsertLineHostCandidate } from "@/lib/line-host-candidates";
import { resolveLineMessagingToken } from "@/lib/line-notify";

type LineWebhookEvent = {
  type?: string;
  timestamp?: number;
  source?: {
    type?: string;
    userId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
};

function verifyLineSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET?.trim();
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(body).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

async function resolveDisplayName(userId: string): Promise<string | undefined> {
  const token = resolveLineMessagingToken().token;
  if (!token || !userId) return undefined;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const data = (await res.json().catch(() => null)) as { displayName?: string } | null;
    const name = String(data?.displayName || "").trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") || "";
  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const payload = (JSON.parse(rawBody || "{}") as { events?: LineWebhookEvent[] }) || {};
  const events = Array.isArray(payload.events) ? payload.events : [];
  let captured = 0;

  for (const event of events) {
    const userId = String(event.source?.userId || "").trim();
    if (!userId) continue;

    const sourceType = String(event.source?.type || "unknown").trim();
    const eventType = String(event.type || "").trim();
    const timestamp = Number(event.timestamp || Date.now());
    const occurredAt = Number.isFinite(timestamp)
      ? new Date(timestamp).toISOString()
      : new Date().toISOString();
    const lastMessage =
      event.message?.type === "text" ? String(event.message?.text || "").trim().slice(0, 120) : undefined;
    const displayName = sourceType === "user" ? await resolveDisplayName(userId) : undefined;

    const saved = await upsertLineHostCandidate({
      userId,
      sourceType,
      displayName,
      lastMessage,
      lastEventType: eventType,
      occurredAt,
    });
    if (saved) captured += 1;
  }

  return NextResponse.json({ ok: true, received: events.length, captured });
}
