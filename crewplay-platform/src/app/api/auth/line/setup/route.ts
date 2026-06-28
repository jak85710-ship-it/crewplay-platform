import { NextResponse } from "next/server";

import {
  getLineCallbackUrl,
  getLineOAuthOrigin,
  getPublicSiteUrl,
  isLineLoginConfigured,
} from "@/lib/line-auth";

/** 公开诊断：显示 LINE Login 需在 Developers Console 登记的 Callback URL */
export async function GET() {
  const site = getPublicSiteUrl();
  const callbackUrl = getLineCallbackUrl();
  const channelId = process.env.LINE_CHANNEL_ID?.trim() || null;

  return NextResponse.json({
    configured: isLineLoginConfigured(),
    channelId,
    siteUrl: site,
    oauthOrigin: getLineOAuthOrigin(),
    callbackUrl,
    registerAt: channelId
      ? `https://developers.line.biz/console/channel/${channelId}/line-login`
      : "https://developers.line.biz/console/",
    note: "请在 LINE Developers → LINE Login 分页新增与 callbackUrl 完全相同的网址（不是官方帐号后台的 Webhook）",
  });
}
