"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { trackAction } from "@/lib/analytics";
import { feeSummary } from "@/lib/utils";

interface Props {
  params: Promise<{ teamId: string }>;
}

type MemberProfile = {
  isLoggedIn: boolean;
  name?: string;
  email?: string;
  contactPhone?: string;
  loginPhone?: string;
  needsEmail?: boolean;
};

type CreditInfo = {
  credit_score: number;
  no_show_count: number;
  can_book: boolean;
  min_score: number;
};

type TeamInfo = {
  arena_name: string;
  fee_amount: number | null;
  fee_label: string;
  introduce: string;
};

export default function BookPage({ params }: Props) {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [credit, setCredit] = useState<CreditInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    slots: 1,
    note: "",
  });

  useEffect(() => {
    params.then(({ teamId: id }) => {
      setTeamId(id);
      Promise.all([
        fetch("/api/member/me", { credentials: "same-origin" }).then((r) => r.json()),
        fetch("/api/member/credit", { credentials: "same-origin" }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`/api/teams/${id}`).then((r) => r.json()),
      ]).then(([memberData, creditData, teamData]) => {
        if (!memberData.isLoggedIn) {
          router.replace(`/login?redirect=${encodeURIComponent(`/book/${id}`)}`);
          return;
        }
        setMember(memberData);
        if (creditData?.credit_score != null) {
          setCredit({
            credit_score: creditData.credit_score,
            no_show_count: creditData.no_show_count ?? 0,
            can_book: creditData.can_book !== false,
            min_score: creditData.min_score ?? 40,
          });
        }
        setForm((prev) => ({
          ...prev,
          guest_name: memberData.name || prev.guest_name,
          guest_email: memberData.email || prev.guest_email,
          guest_phone: memberData.contactPhone || memberData.loginPhone || prev.guest_phone,
        }));
        if (teamData.team) setTeam(teamData.team);
        setAuthChecked(true);
      });
    });
  }, [params, router]);

  const unitPrice = team?.fee_amount ?? 200;
  const total = unitPrice * form.slots;
  const feeLabel = team ? feeSummary(team) : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          team_id: teamId,
          guest_name: form.guest_name,
          guest_email: form.guest_email,
          guest_phone: form.guest_phone,
          slots: form.slots,
          note: form.note,
          amount: total,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(`/book/${teamId}`)}`);
        return;
      }
      if (res.status === 403 && data.error === "credit_blocked") {
        setError(data.message || "信用分不足，暫時無法報名");
        setCredit({
          credit_score: data.credit_score ?? 0,
          no_show_count: data.no_show_count ?? 0,
          can_book: false,
          min_score: 40,
        });
        return;
      }
      if (!res.ok) throw new Error(data.error || data.message || "建立預約失敗");

      trackAction("booking_submitted", { team_id: teamId });
      router.push(`/book/result?status=ok&id=${data.booking.id}&team=${teamId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "錯誤");
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500">
        確認登入狀態…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">快速報名</h1>
      {team && <p className="mt-2 text-slate-600">{team.arena_name}</p>}

      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        <p className="font-semibold">免預付 · 到場向團主繳費</p>
        <p className="mt-1 text-green-800">
          本場無需線上付款{feeLabel ? `，參考團費 ${feeLabel}` : ""}，請於開打時直接交給團主。
        </p>
      </div>

      {credit && !credit.can_book && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold">暫時無法報名</p>
          <p className="mt-1">
            信用分 {credit.credit_score}（低於 {credit.min_score} 分）。爽約 {credit.no_show_count}{" "}
            次會影響後續預約，若有疑問請聯絡客服。
          </p>
        </div>
      )}

      {credit && credit.can_book && credit.no_show_count > 0 && (
        <p className="mt-4 text-sm text-amber-800">
          信用分 {credit.credit_score} / 100（爽約 {credit.no_show_count} 次）
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">姓名</span>
          <input
            required
            value={form.guest_name}
            onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        {member?.needsEmail || !form.guest_email ? (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email（綁定帳號 · 報名通知）</span>
            <input
              required
              type="email"
              value={form.guest_email}
              onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        ) : (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Email</span>
            <p className="mt-1">{form.guest_email}</p>
          </div>
        )}

        <label className="block text-sm">
          <span className="font-medium text-slate-700">手機（選填）</span>
          <input
            type="tel"
            value={form.guest_phone}
            onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
            placeholder="方便團主聯絡，可不填"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">人數</span>
          <input
            type="number"
            min={1}
            max={10}
            value={form.slots}
            onChange={(e) => setForm({ ...form, slots: parseInt(e.target.value, 10) || 1 })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">備註（選填）</span>
          <textarea
            rows={2}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-700">到場付費參考</p>
          <p className="mt-1">
            約 NT$ {unitPrice} × {form.slots} 人 ≈ NT$ {total}
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !teamId || (credit != null && !credit.can_book)}
          className="w-full rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "處理中…" : "快速報名（現場付費）"}
        </button>

        <p className="text-center text-xs text-slate-500">
          報名即表示同意留名額；未到場可能影響後續預約權益。
        </p>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href={`/teams/${teamId}`} className="text-brand-600 hover:underline">
          ← 返回團詳情
        </Link>
      </p>
    </div>
  );
}
