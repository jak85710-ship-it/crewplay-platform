"use client";

import { useState } from "react";

import { AdminBookingsTable } from "@/components/AdminBookingsTable";
import { AdminOneVsOneSection } from "@/components/AdminOneVsOneSection";
import type { Booking } from "@/types";

type Props = {
  bookings: Booking[];
  scanUrls: Record<string, string>;
};

export function AdminDashboard({ bookings, scanUrls }: Props) {
  const [adminKey, setAdminKey] = useState("");

  return (
    <>
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <label className="block font-semibold">管理金鑰（ADMIN_API_KEY）</label>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="僅本機輸入，不會上傳到 Git"
          className="mt-2 w-full max-w-md rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
        />
        <p className="mt-2 text-xs text-amber-800">
          用於爽約管理、1V1 實名審核、到場核銷與缺席核實。
        </p>
      </div>

      <section className="mt-10">
        <h2 className="font-bold text-slate-800">最近預約 · 爽約管理</h2>
        <AdminBookingsTable bookings={bookings} scanUrls={scanUrls} adminKey={adminKey} />
      </section>

      <AdminOneVsOneSection adminKey={adminKey} />
    </>
  );
}
