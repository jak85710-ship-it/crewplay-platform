"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Props = { lineEnabled: boolean };

export function PhoneLoginForm({ lineEnabled }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/my/bookings";
  const lineStatus = searchParams.get("line");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [lineNotice, setLineNotice] = useState("");

  useEffect(() => {
    if (lineStatus === "ok") {
      setLineNotice("LINE 登入成功");
    } else if (lineStatus === "failed") {
      setLineNotice("LINE 登入失敗，請再試一次或改用手機登入");
    } else if (lineStatus === "not_configured") {
      setLineNotice("LINE 登入尚未設定，請聯絡管理員或改用手機登入");
    }
  }, [lineStatus]);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    setDevCode("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        setError("伺服器錯誤，請稍後再試");
        return;
      }
      if (!res.ok) {
        if (data.error === "cooldown") {
          setError(`請 ${data.waitSec ?? 60} 秒後再試`);
        } else if (data.error === "invalid_phone") {
          setError("請輸入正確的台灣手機號碼（09 開頭，10 碼）");
        } else if (data.error === "sms_failed" || data.error === "sms_not_configured") {
          setError(data.message || "簡訊發送失敗，請稍後再試");
        } else {
          setError("無法發送驗證碼，請稍後再試");
        }
        return;
      }
      if (data.devCode) setDevCode(String(data.devCode));
      setStep("code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "驗證失敗");
        return;
      }
      router.push(redirect.startsWith("/") ? redirect : "/my/bookings");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {lineNotice && (
        <p
          className={`mt-6 rounded-xl px-4 py-3 text-sm ${
            lineStatus === "ok"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {lineNotice}
        </p>
      )}

      {step === "phone" ? (
        <form onSubmit={sendCode} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            手機號碼
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "發送中…" : "取得驗證碼"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            驗證碼已發送至 <span className="font-semibold text-slate-900">{phone}</span>
          </p>
          {devCode && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              開發模式驗證碼：<span className="font-mono font-bold">{devCode}</span>
            </p>
          )}
          <label className="block text-sm font-medium text-slate-700">
            6 位數驗證碼
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[0.3em] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "驗證中…" : "登入"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
              setDevCode("");
            }}
            className="w-full text-sm text-slate-500 hover:text-brand-700"
          >
            更換手機號碼
          </button>
        </form>
      )}

      <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">其他登入方式</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {lineEnabled ? (
            <Link
              href={`/api/auth/line/login${redirect.startsWith("/") && redirect !== "/my/bookings" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className="rounded-xl bg-[#06C755] px-4 py-2 text-sm font-semibold text-white"
            >
              LINE 登入
            </Link>
          ) : (
            <span className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
              LINE 登入（尚未設定）
            </span>
          )}
        </div>
      </div>
    </>
  );
}
