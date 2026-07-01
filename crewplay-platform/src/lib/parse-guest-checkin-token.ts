export function parseGuestCheckInToken(text: string): string | null {
  const trimmed = text.trim().replace(/\uFEFF/g, "");
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("t");
    if (fromQuery) return fromQuery.trim();
  } catch {
    /* not a URL */
  }

  const tokenLike = trimmed.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (tokenLike) return tokenLike[0];

  return null;
}
