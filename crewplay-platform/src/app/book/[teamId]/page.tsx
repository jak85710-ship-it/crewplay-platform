"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState } from "react";

import { normalizePhone } from "@/lib/phone-auth";
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

async function fetchMemberProfile(): Promise<MemberProfile> {
  const res = await fetch("/api/member/me", { credentials: "include", cache: "no-store" });
  return res.json();
}

export default function BookPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500">
          載入報名表…
        </div>
      }
    >
      <BookPageInner {...props} />
    </Suspense>
  );
}

function BookPageInner({ params }: Props) {
  const { teamId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionReadyRef = useRef(false);
  const redirectingRef = useRef(false);

  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [credit, setCredit] = useState<CreditInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    slots: 1,
    note: "",
  });

  useEffect(() => {
    const urlError = searchParams.get("error");
    const needsRelogin = searchParams.get("relogin") === "1";
    if (urlError) {
      setError(decodeURIComponent(urlError));
      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState({}, "", `/book/${teamId}`);
      }
    }
    if (needsRelogin) {
      setError((prev) => prev || "登入已過期，請重新登入後再送出報名");
    }
  }, [searchParams, teamId]);

  useEffect(() => {
    if (sessionReadyRef.current) return;

    let cancelled = false;

    async function loadSession() {
      const loginReturn =
        typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).has("line") ||
          sessionStorage.getItem("crewplay_auth_return") === "1");

      let memberData = await fetchMemberProfile();

      if (!memberData.isLoggedIn && loginReturn) {
        await new Promise((r) => setTimeout(r, 400));
        memberData = await fetchMemberProfile();
      }

      if (cancelled) return;

      if (!memberData.isLoggedIn) {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.replace(`/login?redirect=${encodeURIComponent(`/book/${teamId}`)}`);
        }
        return;
      }

      sessionReadyRef.current = true;
      sessionStorage.removeItem("crewplay_auth_return");

      if (typeof window !== "undefined" && window.location.search.includes("line=")) {
        window.history.replaceState({}, "", `/book/${teamId}`);
      }

      const [creditRes, teamRes] = await Promise.all([
        fetch("/api/member/credit", { credentials: "include", cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`/api/teams/${teamId}`, { cache: "no-store" }).then((r) => r.json()),
      ]);

      if (cancelled) return;

      setMember(memberData);
      if (creditRes?.credit_score != null) {
        setCredit({
          credit_score: creditRes.credit_score,
          no_show_count: creditRes.no_show_count ?? 0,
          can_book: creditRes.can_book !== false,
          min_score: creditRes.min_score ?? 40,
        });
      }
      setForm((prev) => ({
        ...prev,
        guest_name: memberData.name || prev.guest_name,
        guest_email: memberData.email || prev.guest_email,
        guest_phone: memberData.contactPhone || memberData.loginPhone || prev.guest_phone,
      }));
      if (teamRes.team) setTeam(teamRes.team);
      setAuthChecked(true);
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [teamId, router]);

  const unitPrice = team?.fee_amount ?? 200;
  const total = unitPrice * form.slots;
  const feeLabel = team ? feeSummary(team) : "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const phone = normalizePhone(form.guest_phone);
    if (!phone) {
      e.preventDefault();
      setError("請填寫有效的手機號碼（09 開頭，10 碼），方便團主聯絡");
      return;
    }
    if (!form.guest_name.trim()) {
      e.preventDefault();
      setError("請填寫姓名");
      return;
    }
    if (!form.guest_email.trim() || !form.guest_email.includes("@")) {
      e.preventDefault();
      setError("請填寫有效的 Email");
      return;
    }
    setError("");
    setSubmitting(true);
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

      <form
        action="/api/bookings/create"
        method="POST"
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="team_id" value={teamId} />
        <input type="hidden" name="amount" value={total} />

        <label className="block text-sm">
          <span className="font-medium text-slate-700">姓名</span>
          <input
            required
            name="guest_name"
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
              name="guest_email"
              value={form.guest_email}
              onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </label>
        ) : (
          <>
            <input type="hidden" name="guest_email" value={form.guest_email} />
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Email</span>
              <p className="mt-1">{form.guest_email}</p>
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
            value={form.guest_phone}
            onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
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
            value={form.slots}
            onChange={(e) => setForm({ ...form, slots: parseInt(e.target.value, 10) || 1 })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">備註（選填）</span>
          <textarea
            name="note"
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

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>{error}</p>
            {error.includes("登入") && (
              <Link
                href={`/login?redirect=${encodeURIComponent(`/book/${teamId}`)}`}
                className="mt-2 inline-block font-semibold underline"
              >
                重新登入
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !teamId || (credit != null && !credit.can_book)}
          className="w-full rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "送出中…" : "快速報名（現場付費）"}
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
