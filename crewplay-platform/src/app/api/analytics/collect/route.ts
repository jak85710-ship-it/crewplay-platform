import { NextResponse } from "next/server";

import { appendAnalyticsEvent } from "@/lib/analytics-store";

type CollectBody = {
  type?: string;
  session_id?: string;
  step_name?: string;
  step_label?: string;
  step_index?: number;
  action?: string;
  page_path?: string;
  meta?: Record<string, string | number | boolean>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CollectBody;
    const type = body.type === "action" ? "action" : body.type === "funnel" ? "funnel" : null;
    if (!type) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }

    const sessionId = String(body.session_id ?? "anonymous").slice(0, 64);
    if (type === "funnel" && !body.step_name) {
      return NextResponse.json({ error: "missing_step" }, { status: 400 });
    }
    if (type === "action" && !body.action) {
      return NextResponse.json({ error: "missing_action" }, { status: 400 });
    }

    await appendAnalyticsEvent({
      type,
      session_id: sessionId,
      step_name: body.step_name ? String(body.step_name).slice(0, 40) : undefined,
      step_label: body.step_label ? String(body.step_label).slice(0, 80) : undefined,
      step_index: typeof body.step_index === "number" ? body.step_index : undefined,
      action: body.action ? String(body.action).slice(0, 60) : undefined,
      page_path: body.page_path ? String(body.page_path).slice(0, 200) : undefined,
      meta: body.meta,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "collect_failed" }, { status: 500 });
  }
}
