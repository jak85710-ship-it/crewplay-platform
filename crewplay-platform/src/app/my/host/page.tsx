import Link from "next/link";
import { cookies } from "next/headers";

import { HostTeamManager } from "@/components/HostTeamManager";
import { getMemberSession } from "@/lib/member-session";

export const dynamic = "force-dynamic";

export default async function MyHostTeamsPage() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">我的開團管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            可自由新增/刪減成員，並調整想預約的總人數。
          </p>
        </div>
        <Link href="/my/bookings" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          回我的預約
        </Link>
      </div>

      {!member.isLoggedIn ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          請先登入後再使用團主編輯功能。
        </p>
      ) : (
        <div className="mt-6">
          <HostTeamManager />
        </div>
      )}
    </div>
  );
}
