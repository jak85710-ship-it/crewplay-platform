import { getPublicSiteUrl } from "@/lib/line-auth";

export function checkInUrl(token: string): string {
  return `${getPublicSiteUrl()}/checkin/scan?t=${encodeURIComponent(token)}`;
}
