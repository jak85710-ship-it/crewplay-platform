import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { getHostIncidentById } from "@/lib/host-incidents";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";

interface Props {
  params: Promise<{ incidentId: string }>;
}

const EVENT_LABEL: Record<string, string> = {
  reported: "建立通報",
  mail_resent: "重送通知信",
  closed: "標記結案",
  reopened: "重新開啟",
};

export const dynamic = "force-dynamic";

export default async function HostIncidentDetailPage({ params }: Props) {
  const { incidentId } = await params;
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          請先登入團主帳號後查看事故案件。
        </p>
      </div>
    );
  }

  const incident = await getHostIncidentById(incidentId);
  if (!incident) notFound();

  const ownedTeams = await listOwnedTeamsForMember(member);
  const team = ownedTeams.find((item) => item.id === incident.team_id);
  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          你沒有此事故案件的查看權限。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">事故案件詳情</h1>
          <p className="mt-1 text-sm text-slate-600">案件編號：{incident.ticket_no || incident.id.slice(0, 8)}</p>
        </div>
        <Link href="/my/host" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          回我的開團管理
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">團隊</p>
        <p className="font-semibold text-slate-900">{team.arena_name}</p>
        <p className="mt-2 text-sm text-slate-500">案件狀態</p>
        <p className={incident.status === "closed" ? "text-emerald-700" : "text-amber-700"}>
          {incident.status === "closed" ? "已結案" : "處理中（未結案）"}
        </p>
        {incident.close_note ? <p className="mt-2 text-sm text-slate-700">結案備註：{incident.close_note}</p> : null}
        <p className="mt-2 text-sm text-slate-700">預約編號：{incident.booking_reference || "未填寫"}</p>
        <p className="mt-1 text-sm text-slate-700">客觀敘述：{incident.summary}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">案件時間軸</p>
        <div className="mt-3 space-y-2">
          {(incident.timeline || []).map((event, idx) => (
            <div key={`${event.at}-${idx}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <p className="font-semibold text-slate-800">{EVENT_LABEL[event.type] || event.type}</p>
              <p className="text-xs text-slate-500">{new Date(event.at).toLocaleString("zh-TW")}</p>
              {event.note ? <p className="mt-1 text-slate-700">{event.note}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

