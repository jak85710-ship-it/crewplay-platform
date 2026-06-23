import { createPrivateKey, sign } from "node:crypto";

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export function isAppleLoginConfigured(): boolean {
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY
  );
}

export function createAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyRaw = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !clientId || !keyId || !privateKeyRaw) {
    throw new Error("Apple Sign In env not configured");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64Url(
    JSON.stringify({
      iss: teamId,
      iat: now,
      exp: now + 86400 * 180,
      aud: "https://appleid.apple.com",
      sub: clientId,
    })
  );
  const data = `${header}.${payload}`;
  const key = createPrivateKey(privateKey);
  const signature = sign("sha256", Buffer.from(data), {
    key,
    dsaEncoding: "ieee-p1363",
  });

  return `${data}.${base64Url(signature)}`;
}

export async function exchangeAppleCode(code: string, redirectUri: string) {
  const clientId = process.env.APPLE_CLIENT_ID!;
  const clientSecret = createAppleClientSecret();

  const res = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apple token exchange failed: ${text}`);
  }

  return res.json() as Promise<{
    access_token?: string;
    id_token?: string;
  }>;
}

export function decodeAppleIdToken(idToken: string): { sub?: string; email?: string } {
  const part = idToken.split(".")[1];
  if (!part) return {};
  const json = Buffer.from(part, "base64url").toString("utf8");
  return JSON.parse(json) as { sub?: string; email?: string };
}
