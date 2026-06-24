import { Suspense } from "react";

import { PhoneLoginForm } from "@/components/PhoneLoginForm";
import { isLineLoginConfigured } from "@/lib/line-auth";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">登入</h1>

      <Suspense fallback={<p className="mt-8 text-center text-sm text-slate-500">載入中…</p>}>
        <PhoneLoginForm lineEnabled={isLineLoginConfigured()} />
      </Suspense>
    </div>
  );
}
