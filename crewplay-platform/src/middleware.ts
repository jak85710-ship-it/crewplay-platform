import { NextResponse, type NextRequest } from "next/server";

const BARE_HOST = "crewplay.tw";
const CANONICAL_HOST = "www.crewplay.tw";

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const hostRaw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const host = hostRaw.split(",")[0]?.trim().toLowerCase();
  const hostname = host.split(":")[0];

  if (hostname !== BARE_HOST) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.protocol = "https";
  url.host = CANONICAL_HOST;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/:path*"],
};
