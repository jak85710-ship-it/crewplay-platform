import { cookieReaderFromHeader } from "@/lib/cookie-reader";
import { getMemberSessionFromReader } from "@/lib/member-session";

export function getLineMemberFromRequest(req: Request) {
  const member = getMemberSessionFromReader(cookieReaderFromHeader(req.headers.get("cookie")));
  if (!member.isLoggedIn || member.method !== "line" || !member.lineUid) {
    return null;
  }
  return member;
}
