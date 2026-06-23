import { listBookings } from "@/lib/bookings";
import { getAllTeams } from "@/lib/teams";

export default async function AdminPage() {
  const teams = await getAllTeams();
  const bookings = await listBookings();
  const sports = [...new Set(teams.map((t) => t.sport))];

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
        <h2 className="font-bold text-slate-800">最近預約</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">訂單</th>
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">金額</th>
                <th className="px-4 py-3">狀態</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 20).map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{b.merchant_trade_no}</td>
                  <td className="px-4 py-3">{b.guest_name}</td>
                  <td className="px-4 py-3">{b.amount}</td>
                  <td className="px-4 py-3">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
