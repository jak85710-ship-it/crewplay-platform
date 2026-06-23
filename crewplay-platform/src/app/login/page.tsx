import { Suspense } from "react";

import { PhoneLoginForm } from "@/components/PhoneLoginForm";
import { isAppleLoginConfigured } from "@/lib/apple-auth";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">登入</h1>
      <p className="mt-2 text-sm text-slate-600">使用手機號碼接收驗證碼，登入後可查看我的預約</p>

      <Suspense fallback={<p className="mt-8 text-center text-sm text-slate-500">載入中…</p>}>
        <PhoneLoginForm appleEnabled={isAppleLoginConfigured()} />
      </Suspense>
    </div>
  );
}
