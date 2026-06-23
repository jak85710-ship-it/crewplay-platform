"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Props {
  params: Promise<{ teamId: string }>;
}

export default function BookPage({ params }: Props) {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [fee, setFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    slots: 1,
    note: "",
  });

  useEffect(() => {
    params.then(({ teamId: id }) => {
      setTeamId(id);
      fetch(`/api/teams/${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.team) {
            setTeamName(data.team.arena_name);
            setFee(data.team.fee_amount);
          }
        });
    });
  }, [params]);

  const unitPrice = fee ?? 200;
  const total = unitPrice * form.slots;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          ...form,
          amount: total,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "建立預約失敗");

      if (data.checkout?.action) {
        const f = document.createElement("form");
        f.method = "POST";
        f.action = data.checkout.action;
        Object.entries(data.checkout.fields as Record<string, string>).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          f.appendChild(input);
        });
        document.body.appendChild(f);
        f.submit();
        return;
      }

      router.push(`/book/result?status=ok&id=${data.booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">預約報名</h1>
      {teamName && <p className="mt-2 text-slate-600">{teamName}</p>}

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
        <label className="block text-sm">
          <span className="font-medium text-slate-700">手機</span>
          <input
            required
            type="tel"
            value={form.guest_phone}
            onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Email（必填，寄送預約通知）</span>
          <input
            required
            type="email"
            value={form.guest_email}
            onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
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
          <span className="font-medium text-slate-700">備註</span>
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <div className="rounded-xl bg-brand-50 p-4 text-sm">
          <p>單價 NT$ {unitPrice} × {form.slots} 人</p>
          <p className="mt-1 text-lg font-bold text-brand-800">合計 NT$ {total}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !teamId}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "處理中…" : "確認並前往付款"}
        </button>
      </form>
    </div>
  );
}
