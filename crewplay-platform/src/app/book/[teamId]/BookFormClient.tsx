"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitBookingAction, type BookFormState } from "./actions";

type Props = {
  teamId: string;
  team: {
    arena_name: string;
    fee_label: string;
  };
  feeLabel: string;
  unitPrice: number;
  member: {
    name: string;
    email: string;
    contactPhone: string;
    needsEmail: boolean;
  };
  credit: {
    credit_score: number;
    no_show_count: number;
    can_book: boolean;
    min_score: number;
  } | null;
};

const initialState: BookFormState = {};

export function BookFormClient({ teamId, team, feeLabel, unitPrice, member, credit }: Props) {
  const [state, formAction, pending] = useActionState(submitBookingAction, initialState);

  const defaultSlots = 1;
  const total = unitPrice * defaultSlots;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">快速報名</h1>
      <p className="mt-2 text-slate-600">{team.arena_name}</p>

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

      <form action={formAction} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="team_id" value={teamId} />
        <input type="hidden" name="amount" value={total} />

        <label className="block text-sm">
          <span className="font-medium text-slate-700">姓名</span>
          <input
            required
            name="guest_name"
            defaultValue={member.name}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        {member.needsEmail || !member.email ? (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email（綁定帳號 · 報名通知）</span>
            <input
              required
              type="email"
              name="guest_email"
              defaultValue={member.email}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        ) : (
          <>
            <input type="hidden" name="guest_email" value={member.email} />
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Email</span>
              <p className="mt-1">{member.email}</p>
            </div>
          </>
        )}

        <label className="block text-sm">
          <span className="font-medium text-slate-700">手機（必填）</span>
          <input
            type="tel"
            required
            name="guest_phone"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={member.contactPhone}
            placeholder="09xx xxx xxx（團主聯絡用）"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">人數</span>
          <input
            type="number"
            name="slots"
            min={1}
            max={10}
            defaultValue={defaultSlots}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">備註（選填）</span>
          <textarea
            name="note"
            rows={2}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-700">到場付費參考</p>
          <p className="mt-1">
            約 NT$ {unitPrice} × {defaultSlots} 人 ≈ NT$ {total}
          </p>
        </div>

        {state.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending || (credit != null && !credit.can_book)}
          className="w-full rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "送出中…" : "快速報名（現場付費）"}
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
