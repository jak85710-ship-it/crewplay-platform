import Link from "next/link";

export default function LiffPage() {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">LINE 內開啟 CrewPlay</h1>
      <p className="mt-4 text-slate-600">
        設定 NEXT_PUBLIC_LINE_LIFF_ID 後，Rich Menu 可連到 LIFF 開啟完整揪團列表。
      </p>
      {liffId ? (
        <p className="mt-2 font-mono text-xs text-slate-400">LIFF: {liffId}</p>
      ) : null}
      <Link href="/teams" className="mt-8 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white">
        前往找揪團
      </Link>
      <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600">
        <p className="font-semibold">Rich Menu 建議連結</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>找揪團 → https://www.crewplay.tw/teams</li>
          <li>LIFF → https://liff.line.me/{`{LIFF_ID}`}?path=/teams</li>
          <li>預約 → https://www.crewplay.tw/book/&#123;teamId&#125;</li>
        </ul>
      </div>
    </div>
  );
}
