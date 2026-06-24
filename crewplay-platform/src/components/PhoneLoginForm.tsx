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
  const [showPhoneLogin, setShowPhoneLogin] = useState(!lineEnabled);

  const lineLoginHref = `/api/auth/line/login${
    redirect.startsWith("/") && redirect !== "/my/bookings"
      ? `?redirect=${encodeURIComponent(redirect)}`
      : ""
  }`;

  useEffect(() => {
    if (lineStatus === "ok") {
      setLineNotice("LINE 登入成功");
    } else if (lineStatus === "failed") {
      setLineNotice("LINE 登入失敗，請再試一次，或改用手機驗證碼");
    } else if (lineStatus === "not_configured") {
      setLineNotice("LINE 登入尚未設定，請改用手機驗證碼或聯絡管理員");
      setShowPhoneLogin(true);
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
        credentials: "same-origin",
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
          setError(String(data.message || "簡訊發送失敗，請稍後再試"));
        } else {
          setError("無法發送驗證碼，請稍後再試");
        }
        return;
      }
      if (data.devCode) setDevCode(String(data.devCode));
      setStep("code");
    } catch {
      setError("連線失敗，請稍後再試");
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

      {lineEnabled && (
        <div className="mt-8 rounded-2xl border border-[#06C755]/30 bg-gradient-to-b from-[#06C755]/10 to-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#06C755] px-2.5 py-0.5 text-xs font-bold text-white">
              推薦
            </span>
            <span className="text-xs font-semibold text-[#058842]">免費 · 一鍵登入</span>
          </div>
          <h2 className="mt-3 text-lg font-bold text-slate-900">使用 LINE 登入</h2>
          <p className="mt-1 text-sm text-slate-600">
            最快、免費，不需收簡訊。登入後可查看我的預約。
          </p>
          <Link
            href={lineLoginHref}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#05b34c]"
          >
            LINE 登入
          </Link>
        </div>
      )}

      {lineEnabled && !showPhoneLogin && step === "phone" && (
        <button
          type="button"
          onClick={() => setShowPhoneLogin(true)}
          className="mt-4 w-full text-center text-sm text-slate-500 underline-offset-2 hover:text-brand-700 hover:underline"
        >
          沒有 LINE？改用手機驗證碼登入
        </button>
      )}

      {(showPhoneLogin || !lineEnabled) && (
        <div
          className={`space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 ${
            lineEnabled ? "mt-4" : "mt-8"
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lineEnabled ? "備用登入方式" : "登入方式"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-800">手機驗證碼登入</h2>
            {lineEnabled && (
              <p className="mt-1 text-xs text-slate-500">需收取簡訊驗證碼，建議優先使用 LINE</p>
            )}
          </div>

          {step === "phone" ? (
            <form onSubmit={sendCode} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                手機號碼
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full rounded-xl border border-brand-300 bg-white py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
              >
                {loading ? "發送中…" : "取得驗證碼"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
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
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xl tracking-[0.3em] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full rounded-xl border border-brand-300 bg-white py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
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

          {lineEnabled && showPhoneLogin && step === "phone" && (
            <button
              type="button"
              onClick={() => {
                setShowPhoneLogin(false);
                setError("");
              }}
              className="w-full text-sm text-slate-500 hover:text-brand-700"
            >
              返回 LINE 登入
            </button>
          )}
        </div>
      )}

      {!lineEnabled && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          LINE 登入尚未設定。目前僅能手機驗證碼登入。
        </div>
      )}
    </>
  );
}
