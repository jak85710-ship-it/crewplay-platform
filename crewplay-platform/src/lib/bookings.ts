import fs from "fs";
import path from "path";
import type { Booking, BookingsManifest } from "@/types";

const BOOKINGS_FILE = path.join(process.cwd(), "public", "data", "bookings.json");

function ensureBookingsFile() {
  const dir = path.dirname(BOOKINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify({ bookings: [] }, null, 2), "utf8");
  }
}

function readBookings(): Booking[] {
  ensureBookingsFile();
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
    const data = JSON.parse(raw) as BookingsManifest;
    return data.bookings ?? [];
  } catch {
    return [];
  }
}

function writeBookings(bookings: Booking[]) {
  ensureBookingsFile();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify({ bookings }, null, 2), "utf8");
}

export async function listBookings(): Promise<Booking[]> {
  const { getSupabaseAdmin } = await import("./teams");
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from("bookings")
      .select("*, team:teams(*)")
      .order("created_at", { ascending: false });
    if (data) return data as Booking[];
  }
  return readBookings().sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
}

export async function getBookingByTradeNo(tradeNo: string): Promise<Booking | null> {
  const list = await listBookings();
  return list.find((b) => b.merchant_trade_no === tradeNo) ?? null;
}

export async function createBooking(input: {
  team_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  slots: number;
  amount: number;
  merchant_trade_no: string;
  note?: string;
}): Promise<Booking> {
  const booking: Booking = {
    id: crypto.randomUUID(),
    team_id: input.team_id,
    guest_name: input.guest_name,
    guest_phone: input.guest_phone,
    guest_email: input.guest_email,
    slots: input.slots,
    amount: input.amount,
    status: "pending_payment",
    payment_provider: "ecpay",
    merchant_trade_no: input.merchant_trade_no,
    note: input.note ?? "",
    created_at: new Date().toISOString(),
  };

  const { getSupabaseAdmin } = await import("./teams");
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("bookings").insert(booking).select().single();
    if (error) throw new Error(error.message);
    return data as Booking;
  }

  const list = readBookings();
  list.push(booking);
  writeBookings(list);
  return booking;
}

export async function markBookingPaid(tradeNo: string): Promise<Booking | null> {
  const { getSupabaseAdmin } = await import("./teams");
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from("bookings")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("merchant_trade_no", tradeNo)
      .select()
      .maybeSingle();
    return (data as Booking) ?? null;
  }

  const list = readBookings();
  const idx = list.findIndex((b) => b.merchant_trade_no === tradeNo);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    status: "paid",
    paid_at: new Date().toISOString(),
  };
  writeBookings(list);
  return list[idx];
}
