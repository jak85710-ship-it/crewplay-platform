import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { MemberAuth } from "@/components/MemberAuth";
import { getMemberSession } from "@/lib/member-session";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-800";

export async function SiteHeader() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <BrandLogo size="nav" showWordmark={false} />

        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <nav className="flex flex-wrap items-center justify-end gap-0.5">
            <Link href="/teams" className={navLink}>
              揪團查詢
            </Link>
            <Link href="/join/host" className={navLink}>
              我要開團
            </Link>
            <Link href="/join/venue" className={navLink}>
              場主刊登
            </Link>
            <Link href="/match" className={navLink}>
              1V1
            </Link>
            <Link href="/my/bookings" className={`${navLink} hidden sm:inline-flex`}>
              我的預約
            </Link>
          </nav>

          <Suspense
            fallback={
              <Link
                href="/login"
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                登入
              </Link>
            }
          >
            <MemberAuth displayName={member.displayName} isLoggedIn={member.isLoggedIn} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-brand-100 bg-brand-900 text-brand-100">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <BrandLogo href="/" size="sm" className="[&_span]:text-white [&_span_span]:text-brand-300" />
            <p className="mt-4 max-w-sm text-brand-200/90">
              高雄市鼓山區文忠路86號3樓 · crew.matchplay@gmail.com · 07-552-2092
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/join/host" className="hover:text-white">
              我要開團
            </Link>
            <Link href="/join/venue" className="hover:text-white">
              場主刊登
            </Link>
            <Link href="/terms" className="hover:text-white">
              服務條款
            </Link>
            <Link href="/privacy" className="hover:text-white">
              隱私權
            </Link>
            <Link href="/refund" className="hover:text-white">
              退款規則
            </Link>
          </div>
        </div>
        <p className="mt-8 text-xs text-brand-300/70">© {new Date().getFullYear()} CrewPlay運動媒合平台</p>
      </div>
    </footer>
  );
}
