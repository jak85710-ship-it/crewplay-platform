export const MATCH_SKILL_LEVELS = ["初學", "入門", "中階", "進階"] as const;

export type MatchSkillLevel = (typeof MATCH_SKILL_LEVELS)[number];
