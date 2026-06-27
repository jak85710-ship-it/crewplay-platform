declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type FunnelStep = {
  name: string;
  label: string;
  index: number;
};

/** 使用者旅程步驟（數字越小越早，供漏斗分析排序） */
export const FUNNEL_STEPS: FunnelStep[] = [
  { name: "home", label: "進入首頁", index: 1 },
  { name: "teams_list", label: "瀏覽揪團列表", index: 2 },
  { name: "team_detail", label: "查看團詳情", index: 3 },
  { name: "book_form", label: "填寫預約表單", index: 4 },
  { name: "book_success", label: "完成預約送出", index: 5 },
  { name: "login", label: "登入頁", index: 6 },
  { name: "my_bookings", label: "我的預約", index: 7 },
  { name: "join_host", label: "團主入駐", index: 8 },
  { name: "join_venue", label: "場地入駐", index: 9 },
];

const SESSION_KEY = "crewplay_sid";

function getSessionId(): string {
  if (typeof window === "undefined") return "anonymous";
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

function collectToServer(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  fetch("/api/analytics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({ ...payload, session_id: getSessionId() }),
  }).catch(() => {});
}

export function resolveFunnelStep(pathname: string, searchParams?: URLSearchParams): FunnelStep | null {
  if (pathname === "/") return FUNNEL_STEPS[0];
  if (pathname === "/teams") return FUNNEL_STEPS[1];
  if (pathname.startsWith("/teams/")) return FUNNEL_STEPS[2];
  if (pathname.startsWith("/book/") && pathname !== "/book/result") return FUNNEL_STEPS[3];
  if (pathname === "/book/result" && searchParams?.get("status") === "ok") return FUNNEL_STEPS[4];
  if (pathname === "/login") return FUNNEL_STEPS[5];
  if (pathname === "/my/bookings") return FUNNEL_STEPS[6];
  if (pathname === "/join/host") return FUNNEL_STEPS[7];
  if (pathname === "/join/venue") return FUNNEL_STEPS[8];
  return null;
}

export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export function trackFunnelStep(step: FunnelStep, pagePath: string) {
  trackEvent("crewplay_funnel", {
    step_name: step.name,
    step_label: step.label,
    step_index: step.index,
    page_path: pagePath,
  });

  collectToServer({
    type: "funnel",
    step_name: step.name,
    step_label: step.label,
    step_index: step.index,
    page_path: pagePath,
  });
}

export function trackFunnelFromRoute(pathname: string, searchParams?: URLSearchParams) {
  const step = resolveFunnelStep(pathname, searchParams);
  if (step) trackFunnelStep(step, pathname);
}

export function trackAction(action: string, detail?: Record<string, string | number | boolean>) {
  trackEvent("crewplay_action", { action, ...detail });

  collectToServer({
    type: "action",
    action,
    page_path: typeof window !== "undefined" ? window.location.pathname : "",
    meta: detail,
  });
}
