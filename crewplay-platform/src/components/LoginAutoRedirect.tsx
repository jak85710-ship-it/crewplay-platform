"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** 已登入時自動離開登入頁，回到原本要去的地方 */
export function LoginAutoRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    const redirect = searchParams.get("redirect") || "/my/bookings";
    const target = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/my/bookings";

    fetch("/api/member/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data.isLoggedIn) {
          router.replace(target);
        }
      })
      .catch(() => {});
  }, [router, searchParams]);

  return null;
}
