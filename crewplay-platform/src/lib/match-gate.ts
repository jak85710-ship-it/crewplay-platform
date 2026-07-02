import type { VerificationStatus } from "@/lib/member-credit";

type MatchGate = {
  allowed: boolean;
  verification_status: VerificationStatus;
};

/** 無法使用 1V1 時，導向實名認證頁或首頁 */
export function matchAccessRedirect(gate: MatchGate, targetPath: string): string | null {
  if (gate.allowed) return null;
  if (gate.verification_status !== "approved") {
    return `/match/verify?redirect=${encodeURIComponent(targetPath)}`;
  }
  return "/match";
}
