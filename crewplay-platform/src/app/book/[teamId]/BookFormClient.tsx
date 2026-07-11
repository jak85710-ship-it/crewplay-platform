"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { VOLLEYBALL_POSITIONS } from "@/lib/volleyball-position";

type Props = {
  teamId: string;
  bookingAuth: string;
  team: {
    arena_name: string;
    fee_label: string;
    sport?: string;
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

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50"
    >
      {pending ? "送出中…" : "快速報名（現場付費）"}
    </button>
  );
}

export function BookFormClient({ teamId, bookingAuth, team, feeLabel, unitPrice, member, credit }: Props) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [slots, setSlots] = useState(1);
  const [slotsInput, setSlotsInput] = useState("1");
  const total = unitPrice * slots;
  const isVolleyball = team.sport === "排球";
  const [volleyballPositions, setVolleyballPositions] = useState<string[]>(
    isVolleyball ? [VOLLEYBALL_POSITIONS[0]] : []
  );
  const [positionDetail, setPositionDetail] = useState("");

  useEffect(() => {
    if (!isVolleyball) return;
    setVolleyballPositions((prev) => {
      const next = [...prev];
      while (next.length < slots) {
        next.push(VOLLEYBALL_POSITIONS[0]);
      }
      return next.slice(0, slots);
    });
  }, [isVolleyball, slots]);

  const volleyballPosition = volleyballPositions[0] ?? VOLLEYBALL_POSITIONS[0];
  const volleyballPositionDetail = useMemo(() => {
    if (!isVolleyball) return positionDetail.trim();
    if (slots <= 1) return positionDetail.trim();
    const group = volleyballPositions.map((pos, idx) => `${idx + 1}.${pos}`).join(" ");
    return [group, positionDetail.trim()].filter(Boolean).join(" | ");
  }, [isVolleyball, slots, volleyballPositions, positionDetail]);

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

      <form
        action="/api/bookings/create"
        method="POST"
        className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="team_id" value={teamId} />
        <input type="hidden" name="amount" value={total} />
        <input type="hidden" name="slots" value={slots} />
        {isVolleyball && <input type="hidden" name="volleyball_position" value={volleyballPosition} />}
        {isVolleyball && (
          <input type="hidden" name="volleyball_position_detail" value={volleyballPositionDetail} />
        )}
        {bookingAuth ? <input type="hidden" name="booking_auth" value={bookingAuth} /> : null}

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
            min={1}
            max={10}
            value={slotsInput}
            onChange={(e) => {
              const raw = e.target.value;
              setSlotsInput(raw);
              const n = Number(raw);
              if (Number.isFinite(n) && n >= 1) {
                setSlots(Math.max(1, Math.min(10, Math.floor(n))));
              }
            }}
            onBlur={() => {
              setSlotsInput(String(slots));
            }}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        {isVolleyball && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4 text-sm">
            <p className="font-semibold text-indigo-900">排球位置偏好（會直接通知團主）</p>
            <p className="mt-1 text-indigo-800">
              可依報名人數分別設定位置，方便團主快速安排。
            </p>
            <div className="mt-3 space-y-2">
              {volleyballPositions.map((value, idx) => (
                <label key={idx} className="block">
                  <span className="font-medium text-slate-700">第 {idx + 1} 位擅長位置</span>
                  <select
                    value={value}
                    onChange={(e) =>
                      setVolleyballPositions((prev) => {
                        const next = [...prev];
                        next[idx] = e.target.value;
                        return next;
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5"
                  >
                    {VOLLEYBALL_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="font-medium text-slate-700">位置補充（選填）</span>
              <input
                type="text"
                value={positionDetail}
                onChange={(e) => setPositionDetail(e.target.value)}
                placeholder="例：主攻／中砲都可，攔中經驗中等"
                className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5"
              />
            </label>
          </div>
        )}

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
            約 NT$ {unitPrice} × {slots} 人 ≈ NT$ {total}
          </p>
        </div>

        {urlError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>{urlError}</p>
          </div>
        )}

        <SubmitButton disabled={credit != null && !credit.can_book} />

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
