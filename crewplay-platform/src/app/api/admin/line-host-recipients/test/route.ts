import { NextResponse } from "next/server";
import { verifyAdminKey } from "@/lib/analytics-store";
import { pushLineTextToRecipients, resolveHostRecipientsByTeam } from "@/lib/line-notify";

export async function POST(req: Request) {
  try {
    if (!verifyAdminKey(req)) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
      | { team_id?: string; text?: string; recipients?: string[] }
      | null;
    const teamId = String(body?.team_id || "").trim();
    const customText = String(body?.text || "").trim();
    const manualRecipients = Array.isArray(body?.recipients)
      ? [...new Set(body!.recipients.map((v) => String(v || "").trim()).filter(Boolean))]
      : [];

    const uniqueRecipients =
      manualRecipients.length > 0 ? manualRecipients : await resolveHostRecipientsByTeam(teamId);
    if (!uniqueRecipients.length) {
      return NextResponse.json({ error: "沒有可測試的收件者，請先設定全域或分團 LINE UID" }, { status: 400 });
    }

    const text =
      customText ||
      [
        "【CrewPlay】LINE 推播測試",
        teamId ? `團隊 ID：${teamId}` : "團隊 ID：未指定（僅全域或手動）",
        manualRecipients.length ? "模式：手動指定 UID 測試" : "模式：系統收件者測試",
        `時間：${new Date().toLocaleString("zh-TW", { hour12: false })}`,
        "此訊息由管理後台測試送出",
      ].join("\n");

    const result = await pushLineTextToRecipients({
      recipients: uniqueRecipients,
      text,
    });

    const hint =
      result.failedReasons.find((r) => r.includes("line_token_missing")) != null
        ? "缺少 LINE Token，請設定 LINE_MESSAGING_CHANNEL_ACCESS_TOKEN（或 LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_ACCESS_TOKEN_LONG_LIVED）。"
        : result.failedReasons.some((r) => r.includes("line_push_failed:401"))
          ? "LINE token 無效或已過期，請更新 LINE Channel Access Token。"
          : result.failedReasons.some((r) => r.includes("line_push_failed:400"))
            ? "收件者 UID 可能無效，或 Bot 尚未與該使用者/群組建立可推播關係。"
            : "請查看 failedReasons 與 details 以確認每個 UID 的錯誤。";

    if (result.success === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "測試訊息送出失敗",
          hint,
          recipients: uniqueRecipients.length,
          ...result,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      hint: result.failed > 0 ? hint : "",
      recipients: uniqueRecipients.length,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "測試訊息送出失敗",
        hint: "伺服器處理測試訊息時發生例外，請檢查 LINE 設定與後台收件者清單。",
        detail: err instanceof Error ? err.message : "unknown_error",
      },
      { status: 500 }
    );
  }
}
