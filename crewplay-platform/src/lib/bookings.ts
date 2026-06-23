import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";
import type { Booking, BookingsManifest } from "@/types";

const BOOKINGS_FILE = path.join(process.cwd(), "public", "data", "bookings.json");
const BLOB_STORE = "crewplay-bookings";
const BLOB_MANIFEST_KEY = "manifest";

/** Writable local JSON only when running `npm run dev` on your machine. */
function useLocalFileStorage(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function ensureLocalBookingsFile() {
  const dir = path.dirname(BOOKINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify({ bookings: [] }, null, 2), "utf8");
  }
}

function readSeedBookings(): Booking[] {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) return [];
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
    const data = JSON.parse(raw) as BookingsManifest;
    return data.bookings ?? [];
  } catch {
    return [];
  }
}

function readBookingsFromFile(): Booking[] {
  ensureLocalBookingsFile();
  return readSeedBookings();
}

function writeBookingsToFile(bookings: Booking[]) {
  ensureLocalBookingsFile();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify({ bookings }, null, 2), "utf8");
}

async function readBookingsFromBlob(): Promise<Booking[]> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_MANIFEST_KEY, { type: "json" });
  if (data && typeof data === "object" && "bookings" in data) {
    return (data as BookingsManifest).bookings ?? [];
  }
  return readSeedBookings();
}

async function writeBookingsToBlob(bookings: Booking[]): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_MANIFEST_KEY, { bookings });
}

async function loadBookings(): Promise<Booking[]> {
  if (useLocalFileStorage()) return readBookingsFromFile();
  return readBookingsFromBlob();
}

async function saveBookings(bookings: Booking[]): Promise<void> {
  if (useLocalFileStorage()) {
    writeBookingsToFile(bookings);
    return;
  }
  await writeBookingsToBlob(bookings);
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
  const list = await loadBookings();
  return list.sort(
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

  const list = await loadBookings();
  list.push(booking);
  await saveBookings(list);
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

  const list = await loadBookings();
  const idx = list.findIndex((b) => b.merchant_trade_no === tradeNo);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    status: "paid",
    paid_at: new Date().toISOString(),
  };
  await saveBookings(list);
  return list[idx];
}
