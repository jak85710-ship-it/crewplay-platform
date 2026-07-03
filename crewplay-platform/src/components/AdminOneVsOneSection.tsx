"use client";

import { AdminMatchPanel } from "@/components/AdminMatchPanel";
import { AdminVerificationPanel } from "@/components/AdminVerificationPanel";

type Props = {
  adminKey: string;
  onAdminKeyChange: (value: string) => void;
};

/** 1VS1 管理區塊（共用 AdminBookingsTable 的管理金鑰） */
export function AdminOneVsOneSection({ adminKey, onAdminKeyChange }: Props) {
  return (
    <>
      <AdminVerificationPanel adminKey={adminKey} onAdminKeyChange={onAdminKeyChange} />
      <AdminMatchPanel adminKey={adminKey} />
    </>
  );
}
