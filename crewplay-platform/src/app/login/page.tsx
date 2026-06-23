import { Suspense } from "react";

import { PhoneLoginForm } from "@/components/PhoneLoginForm";
import { isLineLoginConfigured } from "@/lib/line-auth";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">登入</h1>
      <p className="mt-2 text-sm text-slate-600">
        使用 LINE 或手機驗證碼登入，登入後可查看我的預約
      </p>

      <Suspense fallback={<p className="mt-8 text-center text-sm text-slate-500">載入中…</p>}>
        <PhoneLoginForm lineEnabled={isLineLoginConfigured()} />
      </Suspense>
    </div>
  );
}
