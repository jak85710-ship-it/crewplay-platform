export type MatchStatus = "WAITING" | "MATCHED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED";

export type MatchPingType = "DEPARTED" | "ARRIVED_COUNTER" | "LATE_5MIN" | "NEED_HELP";

export type MatchSession = {
  id: string;
  sport_type: string;
  skill_level: string;
  venue_id: string;
  venue_name: string;
  venue_address: string;
  scheduled_start: string;
  scheduled_end: string;
  host_member_key: string;
  guest_member_key: string | null;
  status: MatchStatus;
  matched_at: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchPing = {
  id: string;
  match_id: string;
  sender_member_key: string;
  ping_type: MatchPingType;
  created_at: string;
};

export type PublicMatchCard = {
  id: string;
  sport_type: string;
  skill_level: string;
  venue_name: string;
  venue_address: string;
  scheduled_start: string;
  scheduled_end: string;
  status: MatchStatus;
};

export type MatchReview = {
  id: string;
  match_id: string;
  reviewer_member_key: string;
  reviewee_member_key: string;
  skill_match: boolean | null;
  is_harassment: boolean;
  is_no_show: boolean;
  admin_verified: boolean;
  admin_verified_at: string | null;
  created_at: string;
};

export type MatchVenue = {
  id: string;
  team_id: string;
  name: string;
  address: string;
  region: string;
  sport_type: string;
};

export const MATCH_PING_LABELS: Record<MatchPingType, string> = {
  DEPARTED: "我已出發",
  ARRIVED_COUNTER: "我已到達櫃檯",
  LATE_5MIN: "我會稍微遲到 5 分鐘",
  NEED_HELP: "我需要場館協助",
};
