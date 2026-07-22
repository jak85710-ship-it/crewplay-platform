import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "報到說明",
  description: "CrewPlay 團主與球友的現場報到完整流程說明。",
};

function StepCard(props: { index: number; title: string; desc: string }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-brand-700">STEP {props.index}</p>
      <p className="mt-1 text-base font-bold text-slate-900">{props.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{props.desc}</p>
    </li>
  );
}

export default function CheckInGuidePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-3xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">CrewPlay Check-In Guide</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">現場報到完整說明</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
          這一頁是球友與團主共用的報到教學。你可以直接把連結放到 LINE 九宮格、群組公告與團主通知中，讓每個人都走同一套流程。
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/teams" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            去找揪團
          </Link>
          <Link href="/my/bookings" className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700">
            我的預約
          </Link>
          <Link href="/my/host" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            我的開團管理
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-900">球友怎麼報到（到場者）</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          <StepCard
            index={1}
            title="先用 LINE 登入 CrewPlay"
            desc="建議先開啟「我的預約」確認自己有該場次。若登入錯帳號，掃碼後會找不到可報到預約。"
          />
          <StepCard
            index={2}
            title="到場後掃團主手機上的 QR Code"
            desc="請掃團主現場出示的專屬報到 QR。這個 QR 會帶你進入球友自助報到頁。"
          />
          <StepCard
            index={3}
            title="畫面顯示『報到成功』與編號"
            desc="看到『報到成功』或『您已完成報到』，再加上報名編號，就代表完成。把這個畫面出示給團主即可。"
          />
          <StepCard
            index={4}
            title="若顯示失敗，先檢查登入帳號"
            desc="最常見原因是登入了不同帳號。請回登入頁後，再掃一次 QR。"
          />
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">團主怎麼執行現場核銷</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          <StepCard
            index={1}
            title="開啟團主掃碼入口"
            desc="從團主通知信或 LINE 推播中的『開啟掃碼按鈕』進入。這個入口是團主自己用，不是給球友點。"
          />
          <StepCard
            index={2}
            title="出示團主專屬 QR 給球友掃"
            desc="讓每位球友用自己的手機掃描，不需要團主逐一手動操作。"
          />
          <StepCard
            index={3}
            title="核對球友手機畫面"
            desc="只要確認畫面有『報到成功』與『報名編號』即可。這就是報到證明。"
          />
          <StepCard
            index={4}
            title="收尾檢查"
            desc="開打前可請晚到球友重新掃碼；已報到者會顯示『您已完成報到』，系統不會重複扣點。"
          />
        </ol>
      </section>

      <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-amber-900">成功畫面判斷標準（現場統一）</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
          <li>有看到「報到成功」或「您已完成報到」</li>
          <li>有顯示「報名編號」</li>
          <li>由球友本人手機畫面出示給團主確認</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">常見問題排查</h2>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Q1：掃完沒有成功訊息？</p>
            <p className="mt-1 text-sm text-slate-600">
              先確認掃的是團主現場 QR，不是舊截圖；再確認是否已登入正確 LINE 帳號，最後重整後再掃一次。
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Q2：顯示請先登入？</p>
            <p className="mt-1 text-sm text-slate-600">
              請先登入，再回到同一支 QR 重新掃描。建議從 LINE 內直接開啟頁面，降低跨瀏覽器登入遺失。
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Q3：顯示找不到可報到預約？</p>
            <p className="mt-1 text-sm text-slate-600">
              通常是登入帳號和報名帳號不同，或未完成該團報名。請到「我的預約」先確認該場次存在。
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Q4：滿團還可以報嗎？</p>
            <p className="mt-1 text-sm text-slate-600">
              不行。滿團會在前端與伺服器同時擋單，避免超額報名。
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">LINE 九宮格連結建議（可直接複製）</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>
            報到說明（本頁）：<span className="font-mono">https://www.crewplay.tw/checkin/guide</span>
          </p>
          <p>
            找揪團：<span className="font-mono">https://www.crewplay.tw/liff/bootstrap?path=/teams</span>
          </p>
          <p>
            我的預約：<span className="font-mono">https://www.crewplay.tw/liff/bootstrap?path=/my/bookings</span>
          </p>
          <p>
            團主管理：<span className="font-mono">https://www.crewplay.tw/liff/bootstrap?path=/my/host</span>
          </p>
        </div>
      </section>
    </div>
  );
}
