import { cookies } from "next/headers";

import { maskPhone, normalizePhone } from "@/lib/phone-auth";

export type MemberSession = {
  isLoggedIn: boolean;
  displayName?: string;
  name?: string;
  email?: string;
  contactPhone?: string;
  phone?: string;
  lineUid?: string;
  appleUid?: string;
  method?: "phone" | "line" | "apple";
};

const PROFILE_COOKIE_OPTS = {
  maxAge: 86400 * 365,
  path: "/",
  sameSite: "lax" as const,
};

export function getMemberSession(cookieStore: Awaited<ReturnType<typeof cookies>>): MemberSession {
  const profileName = cookieStore.get("member_name")?.value?.trim();
  const profileEmail = cookieStore.get("member_email")?.value?.trim();
  const contactPhoneRaw = cookieStore.get("member_contact_phone")?.value?.trim();
  const contactPhone = contactPhoneRaw ? (normalizePhone(contactPhoneRaw) ?? contactPhoneRaw) : undefined;

  const memberPhone = cookieStore.get("member_phone")?.value;
  if (memberPhone) {
    const phone = normalizePhone(memberPhone) ?? memberPhone;
    const name = profileName || undefined;
    return {
      isLoggedIn: true,
      displayName: name || maskPhone(phone),
      name,
      email: profileEmail,
      contactPhone: contactPhone || phone,
      phone,
      method: "phone",
    };
  }

  const lineUid = cookieStore.get("line_uid")?.value;
  const lineName = cookieStore.get("line_name")?.value;
  if (lineUid) {
    const name = profileName || lineName || undefined;
    return {
      isLoggedIn: true,
      displayName: name || "LINE 會員",
      name,
      email: profileEmail,
      contactPhone,
      lineUid,
      method: "line",
    };
  }

  const appleUid = cookieStore.get("apple_uid")?.value;
  const appleName = cookieStore.get("apple_name")?.value;
  if (appleUid) {
    const name = profileName || appleName || undefined;
    return {
      isLoggedIn: true,
      displayName: name || "Apple 會員",
      name,
      email: profileEmail,
      contactPhone,
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

export function setMemberProfileCookies(
  res: { cookies: { set: (name: string, value: string, opts?: object) => void } },
  profile: { name?: string; email?: string; contactPhone?: string }
) {
  if (profile.name?.trim()) {
    res.cookies.set("member_name", profile.name.trim().slice(0, 80), PROFILE_COOKIE_OPTS);
  }
  if (profile.email?.trim() && profile.email.includes("@")) {
    res.cookies.set("member_email", profile.email.trim().slice(0, 120), {
      ...PROFILE_COOKIE_OPTS,
      httpOnly: true,
    });
  }
  if (profile.contactPhone?.trim()) {
    const normalized = normalizePhone(profile.contactPhone.trim());
    if (normalized) {
      res.cookies.set("member_contact_phone", normalized, PROFILE_COOKIE_OPTS);
    }
  }
}

export function clearMemberCookies(res: {
  cookies: { set: (name: string, value: string, opts?: object) => void };
}) {
  for (const key of [
    "member_phone",
    "member_phone_display",
    "member_name",
    "member_email",
    "member_contact_phone",
    "line_uid",
    "line_name",
    "apple_uid",
    "apple_name",
  ]) {
    res.cookies.set(key, "", { maxAge: 0, path: "/" });
  }
}
