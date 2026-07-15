import { notFound, redirect } from "next/navigation";

import { GuestSelfCheckInPanel } from "@/components/GuestSelfCheckInPanel";
import { verifyCheckInToken } from "@/lib/check-in-token";
import { verifyHostPortalToken } from "@/lib/host-portal-token";

interface Props {
  searchParams: Promise<{ t?: string }>;
}

/** 舊 QR 連結相容：導向球友憑證頁 */
export default async function CheckInScanRedirectPage({ searchParams }: Props) {
  const { t } = await searchParams;
  if (!t) {
    redirect("/teams");
  }

  // 相容舊球友條碼（t = guest token）
  if (verifyCheckInToken(t)) {
    redirect(`/checkin/pass?t=${encodeURIComponent(t)}`);
  }

  // 新流程（t = 團主專屬報到 QR token）
  if (!verifyHostPortalToken(t)) {
    notFound();
  }

  return <GuestSelfCheckInPanel portalToken={t} />;
}
