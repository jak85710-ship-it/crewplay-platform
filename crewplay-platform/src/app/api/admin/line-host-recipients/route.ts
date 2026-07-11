import { NextResponse } from "next/server";
import { verifyAdminKey } from "@/lib/analytics-store";
import { getLineHostRecipientsConfig, saveLineHostRecipientsConfig } from "@/lib/line-host-recipients";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  const config = await getLineHostRecipientsConfig();
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { globalRecipients?: unknown; byTeam?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "缺少設定內容" }, { status: 400 });
  }

  const toList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v || "").trim()).filter(Boolean);
    return [];
  };
  const byTeamInput = body.byTeam && typeof body.byTeam === "object" ? body.byTeam : {};
  const byTeam: Record<string, string[]> = {};
  for (const [teamId, ids] of Object.entries(byTeamInput as Record<string, unknown>)) {
    const key = String(teamId || "").trim();
    if (!key) continue;
    byTeam[key] = [...new Set(toList(ids))];
  }

  const config = await saveLineHostRecipientsConfig({
    globalRecipients: [...new Set(toList(body.globalRecipients))],
    byTeam,
  });

  return NextResponse.json({ ok: true, ...config });
}
