import { NextResponse } from "next/server";
import { verifyAdminKey } from "@/lib/analytics-store";
import { getLineHostRecipientsConfig } from "@/lib/line-host-recipients";
import { pushLineTextToRecipients } from "@/lib/line-notify";

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { team_id?: string; text?: string }
    | null;
  const teamId = String(body?.team_id || "").trim();
  const customText = String(body?.text || "").trim();

  const config = await getLineHostRecipientsConfig();
  const recipients = [
    ...(config.byTeam[teamId] || []),
    ...config.globalRecipients,
  ];
  const uniqueRecipients = [...new Set(recipients.map((v) => String(v || "").trim()).filter(Boolean))];
  if (!uniqueRecipients.length) {
    return NextResponse.json({ error: "沒有可測試的收件者，請先設定全域或分團 LINE UID" }, { status: 400 });
  }

  const text =
    customText ||
    [
      "【CrewPlay】LINE 推播測試",
      teamId ? `團隊 ID：${teamId}` : "團隊 ID：未指定（僅全域）",
      `時間：${new Date().toLocaleString("zh-TW", { hour12: false })}`,
      "此訊息由管理後台測試送出",
    ].join("\n");

  const result = await pushLineTextToRecipients({
    recipients: uniqueRecipients,
    text,
  });

  if (result.success === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "測試訊息送出失敗",
        recipients: uniqueRecipients.length,
        ...result,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    recipients: uniqueRecipients.length,
    ...result,
  });
}
