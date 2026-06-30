import { listBookings } from "@/lib/bookings";
import { hostCheckInPortalUrl } from "@/lib/check-in-url";
import { issueHostPortalToken } from "@/lib/host-portal-token";
import { getAllTeams } from "@/lib/teams";

import { AdminBookingsTable } from "@/components/AdminBookingsTable";

export default async function AdminPage() {
  const teams = await getAllTeams();
  const bookings = await listBookings();
  const sports = [...new Set(teams.map((t) => t.sport))];
  const scanUrls = Object.fromEntries(
    bookings.map((b) => {
      const token = issueHostPortalToken(b.team_id);
      return [b.id, token ? hostCheckInPortalUrl(token) : ""];
    })
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">管理後台</h1>
      <p className="mt-2 text-sm text-slate-600">同步狀態與訂單概覽（正式環境請加 ADMIN_API_KEY 保護）</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="上架團數" value={String(teams.length)} />
        <Stat label="運動種類" value={String(sports.length)} />
        <Stat label="預約筆數" value={String(bookings.length)} />
      </div>

      <section className="mt-10">
        <h2 className="font-bold text-slate-800">最近預約 · 爽約管理</h2>
        <AdminBookingsTable bookings={bookings} scanUrls={scanUrls} />
      </section>

      <section className="mt-10 rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-900">
        <p className="font-semibold">同步試算表到網站</p>
        <p className="mt-2">在 crewplay-fb-collector 執行「發布到網站.bat」，或設定 Supabase 後執行 publish-to-api.ps1</p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
