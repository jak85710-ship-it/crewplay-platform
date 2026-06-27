"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { trackFunnelFromRoute } from "@/lib/analytics";

function SiteAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackFunnelFromRoute(pathname, searchParams);
  }, [pathname, searchParams]);

  return null;
}

export function SiteAnalytics() {
  return (
    <Suspense fallback={null}>
      <SiteAnalyticsInner />
    </Suspense>
  );
}
