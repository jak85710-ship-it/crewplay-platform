import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "我要開團",
};

export default function JoinEntryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">我要開團</h1>
      <p className="mt-3 text-slate-600">
        請先選擇您的身分，我們會帶您到對應的申請表單。
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link
          href="/join/host"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300"
        >
          <p className="text-lg font-bold text-slate-900">我是團主，想要開團</p>
          <p className="mt-2 text-sm text-slate-600">
            建立固定運動團，招募球友一起報名參加。
          </p>
        </Link>

        <Link
          href="/join/venue"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300"
        >
          <p className="text-lg font-bold text-slate-900">我是場主，想刊登場地</p>
          <p className="mt-2 text-sm text-slate-600">
            提供場館時段與場租資訊，讓團主與球友預約使用。
          </p>
        </Link>

        <Link
          href="/join/venue-device-consulting"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300"
        >
          <p className="text-lg font-bold text-slate-900">設備連接與進階設定諮詢</p>
          <p className="mt-2 text-sm text-slate-600">
            場地主專屬：串接發球機、智慧看板、門禁與自動化設備，提升場地使用率。
          </p>
        </Link>
      </div>
    </div>
  );
}
