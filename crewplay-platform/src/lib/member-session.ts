import { cookies } from "next/headers";

import { maskPhone, normalizePhone } from "@/lib/phone-auth";

export type MemberSession = {
  isLoggedIn: boolean;
  displayName?: string;
  phone?: string;
  lineUid?: string;
  appleUid?: string;
  method?: "phone" | "line" | "apple";
};

export function getMemberSession(cookieStore: Awaited<ReturnType<typeof cookies>>): MemberSession {
  const memberPhone = cookieStore.get("member_phone")?.value;
  if (memberPhone) {
    const phone = normalizePhone(memberPhone) ?? memberPhone;
    return {
      isLoggedIn: true,
      displayName: maskPhone(phone),
      phone,
      method: "phone",
    };
  }

  const lineUid = cookieStore.get("line_uid")?.value;
  const lineName = cookieStore.get("line_name")?.value;
  if (lineUid) {
    return {
      isLoggedIn: true,
      displayName: lineName || "LINE 會員",
      lineUid,
      method: "line",
    };
  }

  const appleUid = cookieStore.get("apple_uid")?.value;
  const appleName = cookieStore.get("apple_name")?.value;
  if (appleUid) {
    return {
      isLoggedIn: true,
      displayName: appleName || "Apple 會員",
      appleUid,
      method: "apple",
    };
  }

  return { isLoggedIn: false };
}

export function setMemberCookies(
  res: { cookies: { set: (name: string, value: string, opts?: object) => void } },
  phone: string
) {
  const normalized = normalizePhone(phone) ?? phone;
  res.cookies.set("member_phone", normalized, {
    httpOnly: true,
    maxAge: 86400 * 30,
    path: "/",
    sameSite: "lax",
  });
  res.cookies.set("member_phone_display", maskPhone(normalized), {
    maxAge: 86400 * 30,
    path: "/",
    sameSite: "lax",
  });
}

export function clearMemberCookies(res: {
  cookies: { set: (name: string, value: string, opts?: object) => void };
}) {
  for (const key of [
    "member_phone",
    "member_phone_display",
    "line_uid",
    "line_name",
    "apple_uid",
    "apple_name",
  ]) {
    res.cookies.set(key, "", { maxAge: 0, path: "/" });
  }
}
