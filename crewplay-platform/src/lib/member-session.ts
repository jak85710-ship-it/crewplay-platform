import { cookies } from "next/headers";

import { authCookieOptions, clearAuthCookieOptions } from "@/lib/auth-cookies";
import type { CookieReader } from "@/lib/cookie-reader";
import { maskPhone, normalizePhone } from "@/lib/phone-auth";

export type MemberSession = {
  isLoggedIn: boolean;
  memberKey?: string;
  displayName?: string;
  name?: string;
  email?: string;
  contactPhone?: string;
  phone?: string;
  lineUid?: string;
  appleUid?: string;
  method?: "phone" | "line" | "apple" | "email";
};

const PROFILE_COOKIE_OPTS = {
  ...authCookieOptions(86400 * 365),
};

export function getMemberSessionFromReader(cookieStore: CookieReader): MemberSession {
  const profileName = cookieStore.get("member_name")?.value?.trim();
  const profileEmail = cookieStore.get("member_email")?.value?.trim();
  const contactPhoneRaw = cookieStore.get("member_contact_phone")?.value?.trim();
  const contactPhone = contactPhoneRaw ? (normalizePhone(contactPhoneRaw) ?? contactPhoneRaw) : undefined;
  const sessionKey = cookieStore.get("member_session_key")?.value?.trim();

  const lineUid = cookieStore.get("line_uid")?.value;
  const lineName = cookieStore.get("line_name")?.value;
  if (lineUid) {
    const name = profileName || lineName || undefined;
    return {
      isLoggedIn: true,
      memberKey: `line:${lineUid}`,
      displayName: name || "LINE 會員",
      name,
      email: profileEmail,
      contactPhone,
      lineUid,
      method: "line",
    };
  }

  const loginEmail = cookieStore.get("member_login_email")?.value?.trim().toLowerCase();
  if (loginEmail) {
    const name = profileName || loginEmail.split("@")[0];
    return {
      isLoggedIn: true,
      memberKey: `email:${loginEmail}`,
      displayName: name,
      name: profileName || undefined,
      email: loginEmail,
      contactPhone,
      method: "email",
    };
  }

  const memberPhone = cookieStore.get("member_phone")?.value;
  if (memberPhone) {
    const phone = normalizePhone(memberPhone) ?? memberPhone;
    const name = profileName || undefined;
    return {
      isLoggedIn: true,
      memberKey: `phone:${phone}`,
      displayName: name || maskPhone(phone),
      name,
      email: profileEmail,
      contactPhone: contactPhone || phone,
      phone,
      method: "phone",
    };
  }

  const appleUid = cookieStore.get("apple_uid")?.value;
  const appleName = cookieStore.get("apple_name")?.value;
  if (appleUid) {
    const name = profileName || appleName || undefined;
    return {
      isLoggedIn: true,
      memberKey: `apple:${appleUid}`,
      displayName: name || "Apple 會員",
      name,
      email: profileEmail,
      contactPhone,
      appleUid,
      method: "apple",
    };
  }

  if (sessionKey) {
    const [prefix, value] = sessionKey.split(":");
    if (prefix && value) {
      if (prefix === "line") {
        return {
          isLoggedIn: true,
          memberKey: sessionKey,
          lineUid: value,
          displayName: profileName || lineName || "LINE 會員",
          name: profileName || undefined,
          email: profileEmail,
          contactPhone,
          method: "line",
        };
      }
      if (prefix === "email" && value.includes("@")) {
        const email = value.trim().toLowerCase();
        return {
          isLoggedIn: true,
          memberKey: sessionKey,
          displayName: profileName || email.split("@")[0],
          name: profileName || undefined,
          email,
          contactPhone,
          method: "email",
        };
      }
      if (prefix === "phone") {
        const phone = normalizePhone(value) ?? value;
        return {
          isLoggedIn: true,
          memberKey: `phone:${phone}`,
          displayName: profileName || maskPhone(phone),
          name: profileName || undefined,
          email: profileEmail,
          contactPhone: contactPhone || phone,
          phone,
          method: "phone",
        };
      }
      if (prefix === "apple") {
        return {
          isLoggedIn: true,
          memberKey: sessionKey,
          appleUid: value,
          displayName: profileName || "Apple 會員",
          name: profileName || undefined,
          email: profileEmail,
          contactPhone,
          method: "apple",
        };
      }
    }
  }

  if (profileEmail?.includes("@")) {
    const email = profileEmail.trim().toLowerCase();
    return {
      isLoggedIn: true,
      memberKey: `email:${email}`,
      displayName: profileName || email.split("@")[0],
      name: profileName || undefined,
      email,
      contactPhone,
      method: "email",
    };
  }

  if (contactPhone) {
    return {
      isLoggedIn: true,
      memberKey: `phone:${contactPhone}`,
      displayName: profileName || maskPhone(contactPhone),
      name: profileName || undefined,
      contactPhone,
      phone: contactPhone,
      method: "phone",
    };
  }

  return { isLoggedIn: false };
}

export function getMemberSession(cookieStore: Awaited<ReturnType<typeof cookies>>): MemberSession {
  return getMemberSessionFromReader(cookieStore);
}

export function setMemberCookies(
  res: { cookies: { set: (name: string, value: string, opts?: object) => void } },
  phone: string
) {
  const normalized = normalizePhone(phone) ?? phone;
  const opts = authCookieOptions(86400 * 30);
  res.cookies.set("member_phone", normalized, { ...opts, httpOnly: true });
  res.cookies.set("member_phone_display", maskPhone(normalized), opts);
  setMemberSessionKey(res.cookies, `phone:${normalized}`);
}

export function setMemberEmailLogin(
  res: { cookies: { set: (name: string, value: string, opts?: object) => void } },
  email: string
) {
  const normalized = email.trim().toLowerCase();
  const opts = authCookieOptions(86400 * 30);
  res.cookies.set("member_login_email", normalized, { ...opts, httpOnly: true });
  setMemberSessionKey(res.cookies, `email:${normalized}`);
  setMemberProfileCookies(res, { email: normalized });
}

export function setMemberProfileCookies(
  res: { cookies: { set: (name: string, value: string, opts?: object) => void } },
  profile: { name?: string; email?: string; contactPhone?: string }
) {
  applyMemberProfileToCookieStore(res.cookies, profile);
}

type CookieWriter = {
  set: (name: string, value: string, opts?: object) => void;
};

export function setMemberSessionKey(cookieWriter: CookieWriter, memberKey: string) {
  if (!memberKey?.trim()) return;
  cookieWriter.set("member_session_key", memberKey.trim().slice(0, 160), {
    ...authCookieOptions(86400 * 30),
    httpOnly: true,
  });
}

export function applyMemberProfileToCookieStore(
  cookieWriter: CookieWriter,
  profile: { name?: string; email?: string; contactPhone?: string }
) {
  if (profile.name?.trim()) {
    cookieWriter.set("member_name", profile.name.trim().slice(0, 80), PROFILE_COOKIE_OPTS);
  }
  if (profile.email?.trim() && profile.email.includes("@")) {
    cookieWriter.set("member_email", profile.email.trim().slice(0, 120), {
      ...PROFILE_COOKIE_OPTS,
      httpOnly: true,
    });
  }
  if (profile.contactPhone?.trim()) {
    const normalized = normalizePhone(profile.contactPhone.trim());
    if (normalized) {
      cookieWriter.set("member_contact_phone", normalized, PROFILE_COOKIE_OPTS);
    }
  }
}

export function clearMemberCookies(res: {
  cookies: { set: (name: string, value: string, opts?: object) => void };
}) {
  const clearOpts = clearAuthCookieOptions();
  for (const key of [
    "member_phone",
    "member_phone_display",
    "member_name",
    "member_email",
    "member_contact_phone",
    "member_login_email",
    "member_session_key",
    "line_uid",
    "line_name",
    "apple_uid",
    "apple_name",
  ]) {
    res.cookies.set(key, "", clearOpts);
  }
}
