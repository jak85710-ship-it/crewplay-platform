"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { trackAction } from "@/lib/analytics";

type Props = { lineEnabled: boolean };
type LoginMode = "line" | "email" | "phone";

export function PhoneLoginForm({ lineEnabled }: Props) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/my/bookings";
  const lineStatus = searchParams.get("line");
  const sessionExpired =
    searchParams.get("reason") === "session_expired" && searchParams.get("line") !== "ok";

  const [mode, setMode] = useState<LoginMode>(lineEnabled ? "line" : "email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState<"input" | "code">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [lineNotice, setLineNotice] = useState("");

  const lineLoginHref = `/api/auth/line/login${
    redirect.startsWith("/") && !redirect.startsWith("//")
      ? `?redirect=${encodeURIComponent(redirect)}`
      : ""
  }`;

  useEffect(() => {
    if (lineStatus === "ok") {
      setLineNotice("LINE 登入成功");
    } else if (lineStatus === "failed") {
      setLineNotice("LINE 登入失敗，請再試一次，或改用 Email 登入");
    } else if (lineStatus === "not_configured") {
      setLineNotice("LINE 登入尚未設定，請改用 Email 登入");
      setMode("email");
    }
  }, [lineStatus]);

  function resetOtp() {
    setOtpStep("input");
    setCode("");
    setError("");
    setDevCode("");
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    resetOtp();
    setError("");
  }

  async function sendEmailCode(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    setDevCode("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "cooldown") setError(`請 ${data.waitSec ?? 60} 秒後再試`);
        else if (data.error === "invalid_email") setError("請輸入有效的 Email");
        else setError(String(data.message || "無法發送驗證信，請稍後再試"));
        return;
      }
      if (data.devCode) setDevCode(String(data.devCode));
      trackAction("email_otp_sent");
      setOtpStep("code");
    } catch {
      setError("連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "驗證失敗");
        return;
      }
      trackAction("email_login_success");
      sessionStorage.setItem("crewplay_auth_return", "1");
      window.location.assign(redirect.startsWith("/") ? redirect : "/my/bookings");
    } finally {
      setLoading(false);
    }
  }

  async function sendPhoneCode(e?: FormEvent) {
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
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "cooldown") setError(`請 ${data.waitSec ?? 60} 秒後再試`);
        else if (data.error === "invalid_phone") setError("請輸入正確的台灣手機號碼（09 開頭，10 碼）");
        else setError(String(data.message || "簡訊發送失敗，請稍後再試"));
        return;
      }
      if (data.devCode) setDevCode(String(data.devCode));
      trackAction("phone_otp_sent");
      setOtpStep("code");
    } catch {
      setError("連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneCode(e: FormEvent) {
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
      trackAction("phone_login_success");
      sessionStorage.setItem("crewplay_auth_return", "1");
      window.location.assign(redirect.startsWith("/") ? redirect : "/my/bookings");
    } finally {
      setLoading(false);
    }
  }

  const otpTarget = mode === "email" ? email : phone;

  return (
    <>
      {sessionExpired && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          登入狀態已過期，請重新登入後再送出報名。
        </p>
      )}

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

      {mode === "line" && lineEnabled && (
        <>
          <div className="mt-8 rounded-2xl border border-[#06C755]/30 bg-gradient-to-b from-[#06C755]/10 to-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">使用 LINE 登入</h2>
            <Link
              href={lineLoginHref}
              onClick={() => trackAction("line_login_click")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#05b34c]"
            >
              LINE 登入
            </Link>
          </div>
          <button
            type="button"
            onClick={() => switchMode("email")}
            className="mt-4 w-full text-center text-sm text-slate-500 underline-offset-2 hover:text-brand-700 hover:underline"
          >
            沒有 LINE？使用 Email 登入
          </button>
        </>
      )}

      {mode === "email" && (
        <div
          className={`space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 ${
            lineEnabled ? "mt-4" : "mt-8"
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {lineEnabled ? "備用登入方式" : "登入方式"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-800">Email 驗證碼登入</h2>
            <p className="mt-1 text-xs text-slate-500">驗證碼將寄至您的信箱，同時作為報名帳號</p>
          </div>

          {otpStep === "input" ? (
            <form onSubmit={sendEmailCode} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-xl border border-brand-300 bg-white py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
              >
                {loading ? "發送中…" : "寄送驗證碼"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyEmailCode} className="space-y-4">
              <p className="text-sm text-slate-600">
                驗證碼已寄至 <span className="font-semibold text-slate-900">{email}</span>
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
                onClick={resetOtp}
                className="w-full text-sm text-slate-500 hover:text-brand-700"
              >
                更換 Email
              </button>
            </form>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
            {lineEnabled && (
              <button type="button" onClick={() => switchMode("line")} className="text-sm text-slate-500 hover:text-brand-700">
                返回 LINE 登入
              </button>
            )}
            <button type="button" onClick={() => switchMode("phone")} className="text-sm text-slate-500 hover:text-brand-700">
              改用手機驗證碼
            </button>
          </div>
        </div>
      )}

      {mode === "phone" && (
        <div
          className={`space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 ${
            lineEnabled ? "mt-4" : "mt-8"
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">其他方式</p>
            <h2 className="mt-1 text-base font-semibold text-slate-800">手機驗證碼登入</h2>
            <p className="mt-1 text-xs text-slate-500">需收取簡訊，建議優先使用 LINE 或 Email</p>
          </div>

          {otpStep === "input" ? (
            <form onSubmit={sendPhoneCode} className="space-y-4">
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
                className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "發送中…" : "取得簡訊驗證碼"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyPhoneCode} className="space-y-4">
              <p className="text-sm text-slate-600">
                驗證碼已發送至 <span className="font-semibold text-slate-900">{otpTarget}</span>
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
                className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "驗證中…" : "登入"}
              </button>
              <button type="button" onClick={resetOtp} className="w-full text-sm text-slate-500 hover:text-brand-700">
                更換手機號碼
              </button>
            </form>
          )}

          <button type="button" onClick={() => switchMode("email")} className="w-full text-sm text-slate-500 hover:text-brand-700">
            改用 Email 登入
          </button>
        </div>
      )}

      {!lineEnabled && mode === "line" && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          LINE 登入尚未設定。請使用 Email 或手機驗證碼登入。
        </div>
      )}
    </>
  );
}
