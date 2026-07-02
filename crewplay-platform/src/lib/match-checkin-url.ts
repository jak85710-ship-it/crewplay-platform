import { getPublicSiteUrl } from "@/lib/line-auth";

/** 1VS1 對局到場 QR Code 內容（供場館／管理員掃描核銷） */
export function matchCheckInPassUrl(token: string): string {
  return `${getPublicSiteUrl()}/match/checkin?t=${encodeURIComponent(token)}`;
}
