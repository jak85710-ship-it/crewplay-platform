"use client";

import { AdminMatchPanel } from "@/components/AdminMatchPanel";
import { AdminVerificationPanel } from "@/components/AdminVerificationPanel";

type Props = {
  adminKey: string;
};

/** 1VS1 管理區塊（共用 AdminBookingsTable 的管理金鑰） */
export function AdminOneVsOneSection({ adminKey }: Props) {
  return (
    <>
      <AdminVerificationPanel adminKey={adminKey} />
      <AdminMatchPanel adminKey={adminKey} />
    </>
  );
}
