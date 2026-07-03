export const DEFAULT_CREDIT_SCORE = 100;
export const MAX_CREDIT_SCORE = DEFAULT_CREDIT_SCORE;
export const NO_SHOW_PENALTY = 20;

/** 自行取消預約扣分（與爽約相同，不可隨意退團） */
export const CANCEL_BOOKING_PENALTY = NO_SHOW_PENALTY;

/** 信用分自動回補：每 7 天 +10 分（扣 20 分需 14 天補回） */
export const CREDIT_RECOVERY_INTERVAL_DAYS = 7;
export const CREDIT_RECOVERY_POINTS = 10;

export const MIN_BOOKING_SCORE = 40;

/** 1V1 匹配與一般報名共用信用門檻（≥ 40） */
export const MIN_MATCH_SCORE = MIN_BOOKING_SCORE;

/** 1V1 缺席經管理員核實後，停用匹配功能之日數 */
export const MATCH_NO_SHOW_LOCK_DAYS = 90;

/** 試營運場館：萬拓乒乓（teams.json） */
export const PILOT_MATCH_VENUE_TEAM_ID = "27882505-cb9f-4dd2-8001-2f6f2fbc107b";
export const PILOT_MATCH_VENUE_NAME = "萬拓乒乓";
