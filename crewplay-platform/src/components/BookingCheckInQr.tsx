"use client";

import { QRCodeSVG } from "qrcode.react";

import { checkInUrl } from "@/lib/check-in-url";

type Props = {
  token: string;
  reference: string;
  compact?: boolean;
};

export function BookingCheckInQr({ token, reference, compact = false }: Props) {
  const url = checkInUrl(token);

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white text-center ${
        compact ? "p-4" : "p-6 shadow-sm"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">進場條碼</p>
      <p className="mt-1 font-mono text-lg font-bold tracking-wider text-slate-900">{reference}</p>
      <div className="mx-auto mt-4 inline-block rounded-xl border border-slate-100 bg-white p-3">
        <QRCodeSVG value={url} size={compact ? 160 : 200} level="M" includeMargin />
      </div>
      {!compact && (
        <p className="mt-4 text-sm text-slate-600">
          到場時請出示此 QR Code，供團主掃描核對進場。
        </p>
      )}
      <p className="mt-2 text-xs text-slate-400">報名編號 {reference}</p>
    </div>
  );
}
