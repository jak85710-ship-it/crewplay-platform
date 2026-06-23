export type TeamStatus = "published" | "hidden" | "full";
export type BookingStatus = "pending_payment" | "paid" | "cancelled" | "refunded";
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
  published_at?: string;
  updated_at?: string;
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
