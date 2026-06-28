export type CookieReader = {
  get: (name: string) => { value: string } | undefined;
};

export function cookieReaderFromHeader(header: string | null): CookieReader {
  const map = new Map<string, string>();
  if (header) {
    for (const part of header.split(";")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const name = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      try {
        map.set(name, decodeURIComponent(value));
      } catch {
        map.set(name, value);
      }
    }
  }

  return {
    get: (name) => {
      const value = map.get(name);
      return value !== undefined ? { value } : undefined;
    },
  };
}

export function mergeCookieReaders(...readers: CookieReader[]): CookieReader {
  return {
    get: (name) => {
      for (const reader of readers) {
        const hit = reader.get(name);
        if (hit?.value) return hit;
      }
      return undefined;
    },
  };
}
