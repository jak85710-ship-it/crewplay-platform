import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginAutoRedirect } from "@/components/LoginAutoRedirect";
import { PhoneLoginForm } from "@/components/PhoneLoginForm";
import { isLineLoginConfigured } from "@/lib/line-auth";
import { getMemberSession } from "@/lib/member-session";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ redirect?: string }> };

function safeRedirect(path: string | undefined): string {
  if (path?.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login")) {
    return path;
  }
  return "/my/bookings";
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectParam } = await searchParams;
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  if (member.isLoggedIn) {
    redirect(safeRedirect(redirectParam));
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">登入</h1>

      <Suspense fallback={null}>
        <LoginAutoRedirect />
      </Suspense>

      <Suspense fallback={<p className="mt-8 text-center text-sm text-slate-500">載入中…</p>}>
        <PhoneLoginForm lineEnabled={isLineLoginConfigured()} />
      </Suspense>
    </div>
  );
}
