"use client";

import { useEffect, useState } from "react";

import { AdminBookingsTable } from "@/components/AdminBookingsTable";
import { AdminOneVsOneSection } from "@/components/AdminOneVsOneSection";
import { AdminTeamCapacityPanel } from "@/components/AdminTeamCapacityPanel";
import type { Booking } from "@/types";
import type { Team } from "@/types";

type Props = {
  bookings: Booking[];
  teams: Team[];
  teamCapacityOverrides: Record<string, number>;
};

export function AdminDashboard({ bookings, teams, teamCapacityOverrides }: Props) {
  const [adminKey, setAdminKey] = useState("");
  const [verifiedKey, setVerifiedKey] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const isAuthorized = !!adminKey.trim() && adminKey.trim() === verifiedKey;

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_api_key");
    if (saved) setAdminKey(saved);
  }, []);

  useEffect(() => {
    if (adminKey.trim()) {
      window.localStorage.setItem("admin_api_key", adminKey.trim());
    }
  }, [adminKey]);

  function onAdminKeyInput(value: string) {
    setAdminKey(value);
    if (value.trim() !== verifiedKey) {
      setVerifiedKey("");
      setAuthMessage("請按「驗證金鑰」完成身分確認後，才能進行後台修改。");
    }
  }

  async function verifyAdminAccess() {
    if (!adminKey.trim()) {
      setAuthMessage("請先輸入管理金鑰");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const res = await fetch("/api/admin/auth-check", {
        headers: { "x-admin-key": adminKey.trim() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "驗證失敗");
      setVerifiedKey(adminKey.trim());
      setAuthMessage("金鑰驗證成功，可進行後台編輯。");
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : "驗證失敗");
    } finally {
      setAuthBusy(false);
    }
  }

  return (
    <>
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <label className="block font-semibold">管理金鑰（ADMIN_API_KEY）</label>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => onAdminKeyInput(e.target.value)}
          placeholder="僅本機輸入，不會上傳到 Git"
          className="mt-2 w-full max-w-md rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
        />
        <div className="mt-2">
          <button
            type="button"
            onClick={verifyAdminAccess}
            disabled={authBusy}
            className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-60"
          >
            {authBusy ? "驗證中..." : "驗證金鑰"}
          </button>
        </div>
        <p className="mt-2 text-xs text-amber-800">
          用於爽約管理、1V1 實名審核、到場核銷與缺席核實。請輸入「金鑰值」，不是字樣 ADMIN_API_KEY。
        </p>
        {authMessage && <p className="mt-2 text-xs text-amber-900">{authMessage}</p>}
      </div>

      <section className="mt-10">
        <h2 className="font-bold text-slate-800">最近預約 · 爽約管理</h2>
        <AdminBookingsTable bookings={bookings} adminKey={adminKey} isAuthorized={isAuthorized} />
      </section>

      <AdminOneVsOneSection adminKey={adminKey} isAuthorized={isAuthorized} onAdminKeyChange={onAdminKeyInput} />
      <AdminTeamCapacityPanel
        adminKey={adminKey}
        isAuthorized={isAuthorized}
        teams={teams}
        initialOverrides={teamCapacityOverrides}
      />
    </>
  );
}
