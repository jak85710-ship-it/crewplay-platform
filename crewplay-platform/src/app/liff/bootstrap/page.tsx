"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LiffBootstrapInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const path = params.get("path") || "/teams";
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
    if (!liffId || typeof window === "undefined") {
      router.replace(path);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.onload = async () => {
      try {
        await window.liff.init({ liffId });
        if (!window.liff.isLoggedIn()) {
          window.liff.login({ redirectUri: window.location.href });
          return;
        }
      } catch {
        /* fallback */
      }
      router.replace(path);
    };
    document.body.appendChild(script);
  }, [params, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
      正在開啟 CrewPlay…
    </div>
  );
}

export default function LiffBootstrap() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
          正在開啟 CrewPlay…
        </div>
      }
    >
      <LiffBootstrapInner />
    </Suspense>
  );
}

declare global {
  interface Window {
    liff: {
      init: (opts: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      login: (opts: { redirectUri: string }) => void;
    };
  }
}
