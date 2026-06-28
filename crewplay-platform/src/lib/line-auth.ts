export function isLineLoginConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ID?.trim() && process.env.LINE_CHANNEL_SECRET?.trim());
}

/** 使用者瀏覽的正式站網址（裸網域） */
export function getPublicSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) {
    try {
      const u = new URL(configured);
      if (u.hostname === "www.crewplay.tw") {
        return "https://crewplay.tw";
      }
      return configured;
    } catch {
      return configured;
    }
  }
  return "http://localhost:3000";
}

/** LINE OAuth callback 必須與 Developers 後台一致（通常為 www） */
export function getLineOAuthOrigin(): string {
  return (
    process.env.LINE_CALLBACK_ORIGIN?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.crewplay.tw"
  );
}

export function getLineSiteUrl(): string {
  return getPublicSiteUrl();
}

export function getLineCallbackUrl(): string {
  return `${getLineOAuthOrigin()}/api/auth/line/callback`;
}
