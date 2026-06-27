import { NextResponse } from "next/server";

import { listAnalyticsEvents, verifyAdminKey } from "@/lib/analytics-store";
import { buildTrafficSummary } from "@/lib/analytics-summary";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const events = await listAnalyticsEvents();
  const summary = buildTrafficSummary(events);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    totalEvents: events.length,
    summary,
    events,
  });
}
