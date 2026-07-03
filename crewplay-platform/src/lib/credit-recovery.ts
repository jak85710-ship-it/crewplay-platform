import {
  CREDIT_RECOVERY_INTERVAL_DAYS,
  CREDIT_RECOVERY_POINTS,
  MAX_CREDIT_SCORE,
} from "@/lib/member-credit-constants";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type RecoverableProfile = {
  credit_score: number;
  last_credit_recovery_at?: string | null;
  updated_at: string;
};

export type CreditRecoveryInfo = {
  interval_days: number;
  points_per_interval: number;
  next_recovery_at: string | null;
  points_to_next: number;
  points_until_max: number;
};

function recoveryAnchor(profile: RecoverableProfile): Date {
  if (profile.last_credit_recovery_at) {
    return new Date(profile.last_credit_recovery_at);
  }
  return new Date(profile.updated_at);
}

/** 計算並套用被動回補（不寫入儲存） */
export function computeCreditRecovery<T extends RecoverableProfile>(profile: T): T {
  if (profile.credit_score >= MAX_CREDIT_SCORE) {
    return profile;
  }

  const now = new Date();
  const anchor = recoveryAnchor(profile);
  const intervalMs = CREDIT_RECOVERY_INTERVAL_DAYS * MS_PER_DAY;
  const periods = Math.floor((now.getTime() - anchor.getTime()) / intervalMs);

  if (periods <= 0) {
    return profile;
  }

  const pointsToAdd = Math.min(
    periods * CREDIT_RECOVERY_POINTS,
    MAX_CREDIT_SCORE - profile.credit_score
  );

  if (pointsToAdd <= 0) {
    return profile;
  }

  const newScore = profile.credit_score + pointsToAdd;
  const advancedAnchor = new Date(anchor.getTime() + periods * intervalMs);

  return {
    ...profile,
    credit_score: newScore,
    last_credit_recovery_at:
      newScore >= MAX_CREDIT_SCORE ? now.toISOString() : advancedAnchor.toISOString(),
    updated_at: now.toISOString(),
  };
}

export function getCreditRecoveryInfo(profile: RecoverableProfile): CreditRecoveryInfo | null {
  if (profile.credit_score >= MAX_CREDIT_SCORE) {
    return null;
  }

  const anchor = recoveryAnchor(profile);
  const intervalMs = CREDIT_RECOVERY_INTERVAL_DAYS * MS_PER_DAY;
  const nextRecoveryAt = new Date(anchor.getTime() + intervalMs);

  return {
    interval_days: CREDIT_RECOVERY_INTERVAL_DAYS,
    points_per_interval: CREDIT_RECOVERY_POINTS,
    next_recovery_at: nextRecoveryAt.toISOString(),
    points_to_next: CREDIT_RECOVERY_POINTS,
    points_until_max: MAX_CREDIT_SCORE - profile.credit_score,
  };
}

export function formatCreditRecoveryHint(info: CreditRecoveryInfo | null): string | null {
  if (!info) return null;
  const next = new Date(info.next_recovery_at!);
  const dateLabel = next.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
  return `信用分每 ${info.interval_days} 天自動回補 ${info.points_per_interval} 分，下次回補：${dateLabel}（尚差 ${info.points_until_max} 分滿分）`;
}
