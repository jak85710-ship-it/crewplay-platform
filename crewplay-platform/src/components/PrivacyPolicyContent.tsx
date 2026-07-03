import Link from "next/link";

import { LEGAL_ENTITY, VERIFICATION_CONSENT_TEXT } from "@/lib/legal-entity";
import { MATCH_NO_SHOW_LOCK_DAYS, MIN_MATCH_SCORE, PILOT_MATCH_VENUE_NAME, CANCEL_BOOKING_PENALTY, CREDIT_RECOVERY_INTERVAL_DAYS, CREDIT_RECOVERY_POINTS } from "@/lib/member-credit-constants";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">{children}</div>
    </section>
  );
}

export function PrivacyPolicyContent() {
  return (
    <>
      <p className="text-sm text-slate-500">最後更新：{LEGAL_ENTITY.privacyUpdatedAt}</p>

      <p>
        CrewPlay 運動媒合平台（以下稱「本平台」，網址{" "}
        <Link href={LEGAL_ENTITY.siteUrl} className="text-brand-600 underline">
          {LEGAL_ENTITY.siteUrl}
        </Link>
        ）由<strong>{LEGAL_ENTITY.name}</strong>（以下稱「我們」）營運。本政策說明我們如何蒐集、使用、保存及保護您的個人資料。
      </p>

      <Section title="一、適用範圍">
        <p>
          本政策適用於您使用本平台網站、揪團瀏覽、線上報名、會員登入、1VS1 盲盒運動匹配、實名認證、線下場館核銷及相關客服聯繫之情形。
        </p>
      </Section>

      <Section title="二、我們蒐集的資料類型">
        <p>
          <strong>2.1 一般揪團報名</strong>
          <br />
          姓名、電話、電子郵件；若您使用 LINE、Apple 或手機登入，我們亦可能保存相關識別碼；以及報名場次、付款與到場紀錄。
        </p>
        <p>
          <strong>2.2 實名認證（人工後台審核）</strong>
          <br />
          為維護線下見面安全，使用 1VS1 匹配前，您須上傳<strong>身分證或駕照</strong>
          影像供我們人工審核。我們可能保存：證件影像檔（私有儲存、不公開）、審核狀態（待審／通過／拒絕）及審核時間。
        </p>
        <p>
          <strong>2.3 1VS1 盲盒匹配</strong>
          <br />
          運動項目、程度、預約時段、場館；匹配狀態；到場核銷紀錄；系統預設狀態訊息（例如「我已出發」「我已到達櫃檯」），<strong>不含自由文字私訊</strong>
          ；以及活動結束後之互評（球技是否相符、是否疑似非運動騷擾、是否缺席等）。
        </p>
        <p>
          <strong>2.4 信用與治理</strong>
          <br />
          信用分數、爽約或缺席次數、1VS1 功能暫停期限（例如缺席核實後暫停 {MATCH_NO_SHOW_LOCK_DAYS} 日）。
        </p>
        <p>
          <strong>2.5 技術紀錄</strong>
          <br />
          IP 位址、瀏覽器類型、操作紀錄等，用於資訊安全與爭議處理。
        </p>
      </Section>

      <Section title="三、蒐集目的與法律依據">
        <ul className="list-disc space-y-2 pl-5">
          <li>揪團聯絡、報名通知：姓名、電話、電子郵件（契約履行）。</li>
          <li>會員登入：LINE／Apple／手機識別碼（契約履行或經您同意）。</li>
          <li>實名審核、線下安全：證件影像（經您明示同意）。</li>
          <li>1VS1 匹配與到場核銷：匹配與核銷紀錄（契約履行、安全維護）。</li>
          <li>信用與爽約治理：信用分、缺席紀錄（契約履行、平台安全）。</li>
          <li>
            金流：團主／場主刊登費等交易資料，由藍新金流等業者依付款必要範圍處理（契約履行）。
          </li>
        </ul>
      </Section>

      <Section title="四、1VS1 去識別與資料最小化">
        <p>
          匹配成功前，我們不會向另一方揭露您的姓名、照片、性別、年齡等可識別資料；僅顯示運動項目、程度、時段及官方試點場館資訊。匹配後聯繫僅限系統預設狀態按鈕，不提供自由私訊。
        </p>
        <p>
          試營運期間，1VS1 線下核銷場館以<strong>{PILOT_MATCH_VENUE_NAME}</strong>為主；實際開放項目與時段以平台公告為準。
        </p>
      </Section>

      <Section title="五、信用分、取消預約與 1V1 規則">
        <p>
          1V1 匹配與一般揪團報名共用信用分機制，最低使用門檻為 <strong>{MIN_MATCH_SCORE} 分</strong>
          。自行取消預約將扣 <strong>{CANCEL_BOOKING_PENALTY} 分</strong>（與爽約扣分相同）。
        </p>
        <p>
          信用分低於滿分時，每 <strong>{CREDIT_RECOVERY_INTERVAL_DAYS} 天</strong>自動回補{" "}
          <strong>{CREDIT_RECOVERY_POINTS} 分</strong>（扣 {CANCEL_BOOKING_PENALTY} 分約需{" "}
          {(CANCEL_BOOKING_PENALTY / CREDIT_RECOVERY_POINTS) * CREDIT_RECOVERY_INTERVAL_DAYS} 天補回）。
          若經互評與管理員核實為 1V1 缺席，我們得扣減信用分，並自核實日起暫停 1V1 匹配功能{" "}
          <strong>{MATCH_NO_SHOW_LOCK_DAYS} 日</strong>。若信用分低於 {MIN_MATCH_SCORE}
          分，您亦可能無法使用一般揪團報名。
        </p>
      </Section>

      <Section title="六、資料保存期間">
        <ul className="list-disc space-y-2 pl-5">
          <li>報名與交易紀錄：法令或爭議處理所需期間，原則 3 年。</li>
          <li>證件影像：審核完成後 90 日內刪除或去識別；若涉及申訴或爭議，得延長至爭議終結後 30 日。</li>
          <li>1VS1 罐頭狀態紀錄：活動結束後 90 日。</li>
          <li>信用與缺席紀錄：帳號存續期間及停用期滿後 1 年。</li>
        </ul>
      </Section>

      <Section title="七、資料分享對象">
        <p>我們不出售您的個人資料。僅在下列情形分享必要資料：</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            試點合作場館（如 {PILOT_MATCH_VENUE_NAME}）：僅提供到場核銷所需之匹配編號或 QR 核銷結果，<strong>不提供證件影像</strong>。
          </li>
          <li>金流服務商（如藍新金流）：依付款必要範圍。</li>
          <li>雲端託管與技術服務（如 Netlify、Supabase 等）：依服務必要之技術處理。</li>
          <li>依法律或主管機關之合法要求。</li>
        </ul>
      </Section>

      <Section title="八、資料安全">
        <p>
          證件影像存放於非公開儲存空間，僅限授權管理員於審核後台存取；資料傳輸採 HTTPS 加密。我們仍無法保證網路傳輸絕對安全，請您妥善保管帳號與裝置。
        </p>
      </Section>

      <Section title="九、您的權利">
        <p>
          您得依個人資料保護法行使查詢、閱覽、製給複本、補充、更正、停止蒐集／利用或刪除等權利。請來信{" "}
          <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-brand-600 underline">
            {LEGAL_ENTITY.email}
          </a>
          。刪除證件影像可能導致無法使用 1VS1 功能。
        </p>
      </Section>

      <Section title="十、實名認證同意事項">
        <p>上傳證件前，您須勾選同意下列內容：</p>
        <blockquote className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-slate-800">
          {VERIFICATION_CONSENT_TEXT}
        </blockquote>
      </Section>

      <Section title="十一、未成年人">
        <p>若您未滿 18 歲，使用實名認證及 1VS1 服務前，應取得法定代理人同意。</p>
      </Section>

      <Section title="十二、政策修訂">
        <p>我們得修訂本政策，修訂後於網站公布並更新日期。重大變更時，將以網站公告或電子郵件通知。</p>
      </Section>

      <Section title="十三、聯絡方式">
        <ul className="list-none space-y-1 pl-0">
          <li>營運主體：{LEGAL_ENTITY.name}</li>
          <li>地址：{LEGAL_ENTITY.address}</li>
          <li>
            電子郵件：{" "}
            <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-brand-600 underline">
              {LEGAL_ENTITY.email}
            </a>
          </li>
        </ul>
      </Section>
    </>
  );
}
