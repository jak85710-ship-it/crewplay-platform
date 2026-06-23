import Link from "next/link";

import { BrandLogoMark } from "@/components/BrandLogo";

const storyParagraphs = [
  "在 2025 年的夏天，一場討論悄悄展開。我們不是單純的經營者，而是和大家一樣的運動愛好者。我們熱愛流汗的快樂，也知道那份「想打球卻找不到人」的孤單感。",
  "身為場館經營者，我們看見另一個問題：許多運動愛好者願意來運動，但卻缺少誘因長期持續，而場館與球友之間，始終缺少一座真正的橋樑。",
  "於是，我們決定做點改變。在今年我們推出全新的運動媒合平台——這不只是單純的配對工具，而是一個讓更多人能認識、互動、分享運動樂趣的社群。",
  "我們集結了運動愛好者的意見，不斷改善、精進，讓每一次相遇都更自然、更貼近需求。從一場羽球，到一次桌球聚會，我們希望幫助你找到志同道合的夥伴，讓運動不只是活動，而是一段段新的連結。",
];

export function BrandStorySection() {
  return (
    <section className="relative overflow-hidden border-t border-brand-100 bg-gradient-to-b from-brand-50/80 via-white to-brand-50/50 py-20">
      <div
        className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-brand-900 sm:text-4xl">Brand Story</h2>
          <p className="mt-4 text-slate-600">從場館出發，連結每一位想運動的你</p>
        </div>

        <article className="mt-12 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-lg">
          <div className="bg-gradient-to-br from-[#163356] via-[#1e4976] to-[#00aeef] px-6 py-10 text-center text-white sm:px-10">
            <BrandLogoMark size={80} />
            <p className="mt-5 text-2xl font-bold tracking-wide sm:text-3xl">CrewPlay</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-100">
              Find Your Play
            </p>
            <ul className="mx-auto mt-8 flex max-w-xl flex-col gap-2 text-left text-sm text-brand-50 sm:text-base">
              <li className="flex items-start gap-2">
                <span className="text-brand-200" aria-hidden>
                  ●
                </span>
                和我們一樣的運動愛好者
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-200" aria-hidden>
                  ●
                </span>
                懂「想打球卻找不到人」的感受
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-200" aria-hidden>
                  ●
                </span>
                用平台串起場館與球友
              </li>
            </ul>
          </div>

          <div className="space-y-6 px-6 py-10 sm:px-10 sm:py-12">
            {storyParagraphs.map((text, index) => (
              <p key={index} className="text-base leading-[1.85] text-slate-700 sm:text-lg">
                {index === 2 ? (
                  <>
                    於是，我們決定做點改變。在今年我們推出全新的{" "}
                    <strong className="font-semibold text-brand-800">運動媒合平台</strong>
                    ——這不只是單純的配對工具，而是一個讓更多人能
                    <strong className="font-semibold text-brand-800">認識、互動、分享運動樂趣</strong>
                    的社群。
                  </>
                ) : (
                  text
                )}
              </p>
            ))}

            <div className="rounded-2xl bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-8 text-center text-white sm:px-10">
              <p className="text-lg font-bold sm:text-xl">這，就是我們的故事。</p>
              <p className="mt-2 text-sm text-brand-100 sm:text-base">
                也是我們邀請你一起參與的旅程。
              </p>
              <Link
                href="/teams"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-900 transition hover:bg-brand-50"
              >
                開始找團 →
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
