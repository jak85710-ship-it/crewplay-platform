import { Legal } from "@/components/Legal";

export default function PrivacyPage() {
  return (
    <Legal title="隱私權政策">
      <p>我們收集預約所需之姓名、電話、Email，以及 LINE Login 識別碼（若啟用），用於揪團聯絡與訂單對帳。</p>
      <p>資料不會出售予第三方。金流由 ECPay 等合作商處理，請參考其隱私政策。</p>
    </Legal>
  );
}
