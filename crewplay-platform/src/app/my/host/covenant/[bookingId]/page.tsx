import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { bookingReference } from "@/lib/booking-ref";
import { getBookingById } from "@/lib/bookings";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";
import {
  getSafetyCovenantByBookingId,
  SAFETY_COVENANT_ITEMS,
  SAFETY_COVENANT_VERSION,
} from "@/lib/safety-covenant";
import { getTeamById } from "@/lib/teams";

interface Props {
  params: Promise<{ bookingId: string }>;
}

export const dynamic = "force-dynamic";

export default async function HostCovenantPage({ params }: Props) {
  const { bookingId } = await params;
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  if (!member.isLoggedIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          請先登入團主帳號後查看公約紀錄。
        </p>
      </div>
    );
  }

  const booking = await getBookingById(bookingId);
  if (!booking) notFound();

  const [ownedTeams, covenant, team] = await Promise.all([
    listOwnedTeamsForMember(member),
    getSafetyCovenantByBookingId(booking.id),
    getTeamById(booking.team_id),
  ]);
  const owns = ownedTeams.some((t) => t.id === booking.team_id);
  if (!owns) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          你沒有此預約的查看權限。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">運動風險與禮儀數位公約</h1>
          <p className="mt-1 text-sm text-slate-600">
            團主現場出示用，含簽署時間戳記與版本紀錄。
          </p>
        </div>
        <Link href="/my/host" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          回我的開團管理
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">報名編號</p>
        <p className="font-mono text-base font-bold text-slate-900">{bookingReference(booking)}</p>
        <p className="mt-3 text-sm text-slate-500">球友資料</p>
        <p className="text-sm text-slate-900">
          {booking.guest_name} · {booking.guest_phone}
          {booking.guest_email ? ` · ${booking.guest_email}` : ""}
        </p>
        <p className="mt-3 text-sm text-slate-500">揪團</p>
        <p className="text-sm text-slate-900">{team?.arena_name || booking.team_id}</p>
      </div>

      <div
        className={`rounded-2xl border p-5 ${
          covenant
            ? "border-emerald-300 bg-emerald-50 text-emerald-950"
            : "border-rose-300 bg-rose-50 text-rose-900"
        }`}
      >
        <p className="text-base font-bold">
          {covenant ? "🛡 綠色護盾（已簽署安全公約）" : "⚠ 尚未找到簽署紀錄"}
        </p>
        {covenant ? (
          <>
            <p className="mt-2 text-sm">
              簽署時間：{new Date(covenant.accepted_at).toLocaleString("zh-TW")}
            </p>
            <p className="mt-1 text-sm">公約版本：{covenant.policy_version}</p>
          </>
        ) : (
          <p className="mt-2 text-sm">
            可能是舊資料或未完成簽署流程。建議現場請球友重新完成平台預約。
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          公約內容（版本 {covenant?.policy_version || SAFETY_COVENANT_VERSION}）
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {SAFETY_COVENANT_ITEMS.map((item) => {
            const checked =
              item.key === "risk_ack"
                ? Boolean(covenant?.risk_ack)
                : item.key === "etiquette_ack"
                  ? Boolean(covenant?.etiquette_ack)
                  : Boolean(covenant?.mediation_ack);
            return (
              <li key={item.key} className="rounded-lg bg-slate-50 px-3 py-2">
                <span className={checked ? "text-emerald-700" : "text-rose-700"}>
                  {checked ? "☑" : "☐"}
                </span>{" "}
                {item.text}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

