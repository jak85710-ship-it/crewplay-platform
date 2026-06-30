export function parseGuestCheckInToken(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("t");
    if (fromQuery) return fromQuery;
  } catch {
    /* not a URL */
  }

  if (trimmed.includes(".") && trimmed.length > 24) {
    return trimmed;
  }

  return null;
}
