import { bookingReference } from "@/lib/booking-ref";
import type { Booking } from "@/types";

type TeamInfo = {
  arena_name: string;
  sport: string;
  region: string;
  location: string;
};

type Props = {
  booking: Booking;
  team: TeamInfo | null;
};

export function GuestPassPanel({ booking, team }: Props) {
  const ref = bookingReference(booking);
  const checkedIn = Boolean(booking.checked_in_at);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
        CrewPlay 進場條碼
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">報到憑證</h1>
      <p className="mt-2 text-center text-sm text-slate-600">請出示此畫面或 QR Code 給團主掃描</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="font-mono text-center text-xl font-bold tracking-wider text-slate-900">{ref}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="姓名" value={booking.guest_name} />
          <Row label="人數" value={`${booking.slots} 人`} />
          <Row label="參考費用" value={`NT$ ${booking.amount}`} />
          {team && <Row label="揪團" value={team.arena_name} />}
          {team && <Row label="運動" value={`${team.sport} · ${team.region}`} />}
          {team?.location && <Row label="地點" value={team.location} />}
          <Row label="狀態" value={checkedIn ? "已進場" : "待進場"} />
        </dl>
      </div>

      <p className="mt-6 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-center text-sm text-brand-900">
        此頁面供球友出示憑證。進場核銷請由團主使用 Email 內的「進場核銷」連結操作。
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
