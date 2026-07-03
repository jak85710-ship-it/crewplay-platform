import type { VerificationStatus } from "@/lib/member-credit";

export type MatchGate = {
  allowed: boolean;
  verification_status: VerificationStatus;
  block_reason?: string;
};

export type MatchActionTarget = "/match/create" | "/match/browse";

/** 無法使用 1V1 時，導向實名認證頁或首頁（供 create/browse 頁使用） */
export function matchAccessRedirect(gate: MatchGate, targetPath: string): string | null {
  if (gate.allowed) return null;
  if (gate.verification_status !== "approved") {
    return `/match/verify?redirect=${encodeURIComponent(targetPath)}`;
  }
  return null;
}

/** 1V1 首頁／導覽用的目標網址（避免已登入卻來回跳轉） */
export function matchActionHref(
  isLoggedIn: boolean,
  gate: MatchGate | null,
  target: MatchActionTarget
): string {
  if (!isLoggedIn) {
    return `/login?redirect=${encodeURIComponent(target)}`;
  }
  if (!gate || gate.verification_status !== "approved") {
    return `/match/verify?redirect=${encodeURIComponent(target)}`;
  }
  if (!gate.allowed) {
    return `${target}?blocked=1`;
  }
  return target;
}

export function matchActionBlockedReason(gate: MatchGate | null): string | null {
  if (!gate || gate.allowed) return null;
  if (gate.verification_status !== "approved") {
    return gate.block_reason ?? "請先完成實名認證。";
  }
  return gate.block_reason ?? "目前無法使用 1V1 匹配。";
}
