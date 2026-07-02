import { Legal } from "@/components/Legal";
import { LEGAL_ENTITY } from "@/lib/legal-entity";
import { MIN_BOOKING_SCORE } from "@/lib/member-credit-constants";

export default function TermsPage() {
  return (
    <Legal title="服務條款">
      <p className="text-sm text-slate-500">最後更新：{LEGAL_ENTITY.privacyUpdatedAt}</p>
      <p>
        CrewPlay 運動媒合平台（{LEGAL_ENTITY.siteUrl}）由 {LEGAL_ENTITY.name} 提供揪團資訊瀏覽、線上報名及 1VS1
        盲盒匹配等服務。使用者應提供正確聯絡方式，並遵守各揪團及場館之規則。
      </p>
      <p>
        報名者之團費請依揪團說明向團主繳交，平台不代收揪團費用。團主開團、場主刊登之平台服務費，依各表單說明線上收取。
      </p>
      <p>
        使用 1VS1 匹配前須完成實名認證；信用分須達 {MIN_BOOKING_SCORE}{" "}
        分以上。若 1VS1 對局缺席經核實，平台得暫停 1VS1 功能，詳見{" "}
        <a href="/privacy" className="text-brand-600 underline">
          隱私權政策
        </a>
        。
      </p>
      <p>
        客服聯絡：{LEGAL_ENTITY.email}　地址：{LEGAL_ENTITY.address}
      </p>
    </Legal>
  );
}
