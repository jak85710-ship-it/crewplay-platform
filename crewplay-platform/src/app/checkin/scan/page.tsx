import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ t?: string }>;
}

/** 舊 QR 連結相容：導向球友憑證頁 */
export default async function CheckInScanRedirectPage({ searchParams }: Props) {
  const { t } = await searchParams;
  if (t) {
    redirect(`/checkin/pass?t=${encodeURIComponent(t)}`);
  }
  redirect("/teams");
}
