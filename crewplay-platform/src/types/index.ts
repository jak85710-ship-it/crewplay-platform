export type TeamStatus = "published" | "hidden" | "full";
export type SubscriptionPlan = "FREE" | "PRO";
export type BookingStatus =
  | "submitted"
  | "pending_payment"
  | "paid"
  | "cancelled"
  | "refunded"
  | "no_show";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Team {
  id: string;
  sheet_row: number;
  sport: string;
  arena_name: string;
  introduce: string;
  photo: string;
  assign_url: string;
  region: string;
  location: string;
  fee_amount: number | null;
  fee_label: string;
  status: TeamStatus;
  is_featured?: boolean;
  published_at?: string;
  updated_at?: string;
}

export interface HostSubscriptionProfile {
  host_id: string;
  subscription_plan: SubscriptionPlan;
  monthly_leads_used: number;
  quota_reset_date: string;
  updated_at: string;
}

export interface HostLead {
  id: string;
  host_id: string;
  team_id: string;
  player_info: {
    name?: string;
    email?: string;
    line_id?: string;
    note?: string;
    sport?: string;
    region?: string;
  };
  is_unlocked: boolean;
  unlocked_at?: string | null;
  created_at: string;
}

export interface TeamContact {
  team_id: string;
  contact: string;
  extra_notes: string;
  raw_text: string;
}

export interface Booking {
  id: string;
  team_id: string;
  user_id?: string | null;
  member_key?: string | null;
  line_uid?: string | null;
  apple_uid?: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  slots: number;
  amount: number;
  status: BookingStatus;
  payment_provider: string;
  merchant_trade_no: string | null;
  note: string;
  paid_at?: string | null;
  no_show_at?: string | null;
  cancelled_at?: string | null;
  checked_in_at?: string | null;
  created_at?: string;
  team?: Team;
}

export interface TeamsManifest {
  exportedAt: string;
  count: number;
  teams: Team[];
}

export interface BookingsManifest {
  bookings: Booking[];
}
