import { getPublicSiteUrl } from "@/lib/line-auth";

/** 球友 QR Code 內容：僅顯示報到條碼，不含團主核銷介面 */
export function checkInPassUrl(token: string): string {
  return `${getPublicSiteUrl()}/checkin/pass?t=${encodeURIComponent(token)}`;
}

/** 團主 Email 內的進場核銷入口（手機掃碼） */
export function hostCheckInPortalUrl(portalToken: string): string {
  return `${getPublicSiteUrl()}/checkin/host?t=${encodeURIComponent(portalToken)}`;
}

/** @deprecated 使用 checkInPassUrl */
export function checkInUrl(token: string): string {
  return checkInPassUrl(token);
}
