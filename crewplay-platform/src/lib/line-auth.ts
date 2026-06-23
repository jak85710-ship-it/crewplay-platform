export function isLineLoginConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ID?.trim() && process.env.LINE_CHANNEL_SECRET?.trim());
}

export function getLineSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function getLineCallbackUrl(site = getLineSiteUrl()): string {
  return `${site.replace(/\/$/, "")}/api/auth/line/callback`;
}
