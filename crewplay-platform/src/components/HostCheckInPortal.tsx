"use client";

import { FormEvent, useCallback, useState } from "react";

import { HostCheckInConfirmPanel } from "@/components/HostCheckInConfirmPanel";
import { QrScanner } from "@/components/QrScanner";
import { normalizePhone } from "@/lib/phone-auth";
import { parseGuestCheckInToken } from "@/lib/parse-guest-checkin-token";
import type { Booking } from "@/types";

type TeamInfo = {
  id: string;
  arena_name: string;
  sport: string;
  region: string;
  location: string;
};

type LookupResult = {
  token: string;
  booking: Booking;
  team: {
    arena_name: string;
    sport: string;
    region: string;
    location: string;
  } | null;
};

type Props = {
  portalToken: string;
  team: TeamInfo;
};

export function HostCheckInPortal({ portalToken, team }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState<"input" | "code">("input");
  const [otpTarget, setOtpTarget] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);

  async function sendPhoneCode(e?: FormEvent) {
    e?.preventDefault();
    setMessage("");
    setDevCode("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "cooldown") setMessage(`請 ${data.waitSec ?? 60} 秒後再試`);
        else if (data.error === "invalid_phone") setMessage("請輸入正確的台灣手機號碼（09 開頭，10 碼）");
        else setMessage(String(data.message || "簡訊發送失敗，請稍後再試"));
        return;
      }
      if (data.devCode) setDevCode(String(data.devCode));
      setOtpTarget(normalizePhone(phone) || phone.trim());
      setOtpStep("code");
      setCode("");
    } catch {
      setMessage("連線失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function verifyHostPhone(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/checkin/host/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ portalToken, phone: otpTarget, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "驗證失敗");
        return;
      }
      setAuthenticated(true);
      setMessage("");
    } catch {
      setMessage("連線失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  const handleScan = useCallback(
    async (text: string) => {
      const guestToken = parseGuestCheckInToken(text);
      if (!guestToken) {
        setMessage("無法辨識此 QR Code，請掃描球友的進場條碼");
        return;
      }

      setBusy(true);
      setMessage("");
      try {
        const res = await fetch("/api/checkin/host/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ guestToken, portalToken }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "查詢失敗");
          return;
        }
        setLookup(data as LookupResult);
      } catch {
        setMessage("連線失敗，請稍後再試");
      } finally {
        setBusy(false);
      }
    },
    [portalToken]
  );

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
        CrewPlay 團主核銷
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">進場掃碼</h1>
      <p className="mt-2 text-center text-sm text-slate-600">{team.arena_name}</p>

      {!authenticated ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">團主驗證</p>
            <h2 className="mt-1 text-base font-semibold text-slate-800">手機驗證碼登入</h2>
            <p className="mt-1 text-xs text-slate-500">請使用您登記的手機號碼，登入後即可掃描球友 QR Code</p>
          </div>

          {otpStep === "input" ? (
            <form onSubmit={sendPhoneCode} className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">手機號碼</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !phone.trim()}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy ? "發送中…" : "取得簡訊驗證碼"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyHostPhone} className="space-y-3">
              <p className="text-sm text-slate-600">
                驗證碼已發送至 <span className="font-semibold text-slate-900">{otpTarget}</span>
              </p>
              {devCode && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  開發模式驗證碼：<span className="font-mono font-bold">{devCode}</span>
                </p>
              )}
              <label className="block text-sm">
                <span className="font-medium text-slate-700">6 位數驗證碼</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-lg tracking-[0.3em]"
                />
              </label>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy ? "驗證中…" : "開始掃碼核銷"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep("input");
                  setCode("");
                  setMessage("");
                }}
                className="w-full text-sm text-slate-500 hover:text-brand-700"
              >
                更換手機號碼
              </button>
            </form>
          )}
        </div>
      ) : lookup ? (
        <div className="mt-6">
          <HostCheckInConfirmPanel
            token={lookup.token}
            booking={lookup.booking}
            team={lookup.team}
            onDone={() => setLookup(null)}
            onCancel={() => setLookup(null)}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">請對準球友「我的預約」或確認信中的 QR Code 掃描。</p>
          <QrScanner onScan={handleScan} />
        </div>
      )}

      {message && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </p>
      )}
    </div>
  );
}
