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

export async function getBookingById(id: string): Promise<Booking | null> {
  const list = await listBookings();
  return list.find((b) => b.id === id) ?? null;
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
  note?: string;
  member_key?: string | null;
  line_uid?: string | null;
  apple_uid?: string | null;
}): Promise<Booking> {
  const booking: Booking = {
    id: crypto.randomUUID(),
    team_id: input.team_id,
    guest_name: input.guest_name,
    guest_phone: input.guest_phone,
    guest_email: input.guest_email,
    slots: input.slots,
    amount: input.amount,
    status: "submitted",
    payment_provider: "none",
    merchant_trade_no: null,
    note: input.note ?? "",
    created_at: new Date().toISOString(),
  };

  if (input.member_key) booking.member_key = input.member_key;
  if (input.line_uid) booking.line_uid = input.line_uid;
  if (input.apple_uid) booking.apple_uid = input.apple_uid;

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

export async function markBookingNoShow(bookingId: string): Promise<{
  booking: Booking | null;
  memberKey: string | null;
  alreadyMarked: boolean;
}> {
  const { getMemberKeyFromBooking } = await import("./member-key");
  const { applyNoShowPenalty } = await import("./member-credit");

  const { getSupabaseAdmin } = await import("./teams");
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data: existing } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (!existing) return { booking: null, memberKey: null, alreadyMarked: false };
    const booking = existing as Booking;
    if (booking.status === "no_show") {
      return { booking, memberKey: getMemberKeyFromBooking(booking), alreadyMarked: true };
    }
    const { data } = await supabase
      .from("bookings")
      .update({ status: "no_show", no_show_at: new Date().toISOString() })
      .eq("id", bookingId)
      .select()
      .maybeSingle();
    const updated = (data as Booking) ?? null;
    const memberKey = updated ? getMemberKeyFromBooking(updated) : null;
    if (memberKey) await applyNoShowPenalty(memberKey);
    return { booking: updated, memberKey, alreadyMarked: false };
  }

  const list = await loadBookings();
  const idx = list.findIndex((b) => b.id === bookingId);
  if (idx < 0) return { booking: null, memberKey: null, alreadyMarked: false };

  const existing = list[idx];
  if (existing.status === "no_show") {
    return { booking: existing, memberKey: getMemberKeyFromBooking(existing), alreadyMarked: true };
  }

  list[idx] = {
    ...existing,
    status: "no_show",
    no_show_at: new Date().toISOString(),
  };
  await saveBookings(list);

  const memberKey = getMemberKeyFromBooking(list[idx]);
  if (memberKey) await applyNoShowPenalty(memberKey);
  return { booking: list[idx], memberKey, alreadyMarked: false };
}

export async function markBookingCheckedIn(bookingId: string): Promise<{
  booking: Booking | null;
  alreadyCheckedIn: boolean;
}> {
  const { getSupabaseAdmin } = await import("./teams");
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (supabase) {
    const { data: existing } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (!existing) return { booking: null, alreadyCheckedIn: false };
    const booking = existing as Booking;
    if (booking.checked_in_at) {
      return { booking, alreadyCheckedIn: true };
    }
    const { data } = await supabase
      .from("bookings")
      .update({ checked_in_at: now })
      .eq("id", bookingId)
      .select()
      .maybeSingle();
    return { booking: (data as Booking) ?? null, alreadyCheckedIn: false };
  }

  const list = await loadBookings();
  const idx = list.findIndex((b) => b.id === bookingId);
  if (idx < 0) return { booking: null, alreadyCheckedIn: false };

  const existing = list[idx];
  if (existing.checked_in_at) {
    return { booking: existing, alreadyCheckedIn: true };
  }

  list[idx] = { ...existing, checked_in_at: now };
  await saveBookings(list);
  return { booking: list[idx], alreadyCheckedIn: false };
}

const CANCELLABLE_STATUSES = new Set<Booking["status"]>(["submitted", "pending_payment", "paid"]);

export async function cancelBookingByMember(
  bookingId: string,
  memberKey: string
): Promise<
  | { ok: true; booking: Booking; credit_score: number; penalty: number }
  | { ok: false; error: string; code?: string }
> {
  const { bookingBelongsToMemberKey } = await import("./member-key");
  const { applyCancelPenalty, CANCEL_BOOKING_PENALTY } = await import("./member-credit");

  const booking = await getBookingById(bookingId);
  if (!booking) {
    return { ok: false, error: "找不到預約", code: "not_found" };
  }

  if (!bookingBelongsToMemberKey(booking, memberKey)) {
    return { ok: false, error: "您無法取消此預約", code: "forbidden" };
  }

  if (booking.checked_in_at) {
    return { ok: false, error: "已進場的預約無法取消", code: "checked_in" };
  }

  if (booking.status === "cancelled") {
    return { ok: false, error: "此預約已取消", code: "already_cancelled" };
  }

  if (booking.status === "no_show" || booking.status === "refunded") {
    return { ok: false, error: "此預約狀態無法取消", code: "invalid_status" };
  }

  if (!CANCELLABLE_STATUSES.has(booking.status)) {
    return { ok: false, error: "此預約狀態無法取消", code: "invalid_status" };
  }

  const now = new Date().toISOString();
  const { getSupabaseAdmin } = await import("./teams");
  const supabase = getSupabaseAdmin();

  let updated: Booking;

  if (supabase) {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: now })
      .eq("id", bookingId)
      .select()
      .maybeSingle();
    if (error || !data) {
      return { ok: false, error: error?.message || "取消失敗", code: "server" };
    }
    updated = data as Booking;
  } else {
    const list = await loadBookings();
    const idx = list.findIndex((b) => b.id === bookingId);
    if (idx < 0) {
      return { ok: false, error: "找不到預約", code: "not_found" };
    }
    list[idx] = { ...list[idx], status: "cancelled", cancelled_at: now };
    await saveBookings(list);
    updated = list[idx];
  }

  const profile = await applyCancelPenalty(memberKey);

  return {
    ok: true,
    booking: updated,
    credit_score: profile.credit_score,
    penalty: CANCEL_BOOKING_PENALTY,
  };
}

export async function cancelBookingByAdmin(
  bookingId: string
): Promise<
  | { ok: true; booking: Booking; alreadyCancelled: boolean }
  | { ok: false; error: string; code?: string }
> {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    return { ok: false, error: "找不到預約", code: "not_found" };
  }

  if (booking.checked_in_at) {
    return { ok: false, error: "已進場的預約無法取消", code: "checked_in" };
  }

  if (booking.status === "cancelled") {
    return { ok: true, booking, alreadyCancelled: true };
  }

  if (booking.status === "no_show" || booking.status === "refunded") {
    return { ok: false, error: "此預約狀態無法取消", code: "invalid_status" };
  }

  const now = new Date().toISOString();
  const { getSupabaseAdmin } = await import("./teams");
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: now })
      .eq("id", bookingId)
      .select()
      .maybeSingle();
    if (error || !data) {
      return { ok: false, error: error?.message || "取消失敗", code: "server" };
    }
    return { ok: true, booking: data as Booking, alreadyCancelled: false };
  }

  const list = await loadBookings();
  const idx = list.findIndex((b) => b.id === bookingId);
  if (idx < 0) {
    return { ok: false, error: "找不到預約", code: "not_found" };
  }
  list[idx] = { ...list[idx], status: "cancelled", cancelled_at: now };
  await saveBookings(list);
  return { ok: true, booking: list[idx], alreadyCancelled: false };
}

export async function revertBookingNoShow(bookingId: string): Promise<
  | { ok: true; booking: Booking; memberKey: string | null }
  | { ok: false; error: string; code?: string }
> {
  const { getMemberKeyFromBooking } = await import("./member-key");

  const booking = await getBookingById(bookingId);
  if (!booking) {
    return { ok: false, error: "找不到預約", code: "not_found" };
  }
  if (booking.status !== "no_show") {
    return { ok: false, error: "僅可回復爽約扣分", code: "invalid_status" };
  }

  const { getSupabaseAdmin } = await import("./teams");
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "submitted", no_show_at: null })
      .eq("id", bookingId)
      .select()
      .maybeSingle();
    if (error || !data) {
      return { ok: false, error: error?.message || "回復失敗", code: "server" };
    }
    const updated = data as Booking;
    return { ok: true, booking: updated, memberKey: getMemberKeyFromBooking(updated) };
  }

  const list = await loadBookings();
  const idx = list.findIndex((b) => b.id === bookingId);
  if (idx < 0) {
    return { ok: false, error: "找不到預約", code: "not_found" };
  }
  list[idx] = { ...list[idx], status: "submitted", no_show_at: null };
  await saveBookings(list);
  return { ok: true, booking: list[idx], memberKey: getMemberKeyFromBooking(list[idx]) };
}
