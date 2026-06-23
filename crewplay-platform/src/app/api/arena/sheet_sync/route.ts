import { NextResponse } from "next/server";
import { getAllTeams } from "@/lib/teams";

/**
 * Legacy compatibility for crewplay-fb-collector sync scripts.
 * Old LINE「即時預約」in-chat search used api.crewplay.tw (separate server).
 * Web data lives in teams.json on www.crewplay.tw — update via publish-to-api.ps1 + deploy.
 */
export async function POST() {
  const teams = await getAllTeams();
  return NextResponse.json({
    ok: true,
    source: "www.crewplay.tw",
    teams: teams.length,
    message:
      "Web 揪團資料已就緒。LINE 圖文選單「即時預約」請改連 https://www.crewplay.tw/teams 或 LIFF；舊 api.crewplay.tw 內建搜尋需另修復。",
  });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "method_not_allowed",
      message: "請使用 POST（與舊 sheet_sync 腳本相同）",
    },
    { status: 405 }
  );
}
