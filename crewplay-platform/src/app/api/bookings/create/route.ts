import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { processMemberBooking, siteUrlFromRequest, type BookingInput } from "@/lib/create-member-booking";
import { setMemberProfileCookies } from "@/lib/member-session";

function parseBody(raw: Record<string, FormDataEntryValue | unknown>): BookingInput {
  return {
    team_id: String(raw.team_id ?? ""),
    guest_name: String(raw.guest_name ?? ""),
    guest_email: String(raw.guest_email ?? ""),
    guest_phone: String(raw.guest_phone ?? ""),
    slots: parseInt(String(raw.slots ?? "1"), 10) || 1,
    note: String(raw.note ?? ""),
    amount: parseInt(String(raw.amount ?? "0"), 10) || 0,
  };
}

function isFormRequest(req: Request): boolean {
  const type = req.headers.get("content-type") ?? "";
  return type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data");
}

export async function POST(req: Request) {
  const formMode = isFormRequest(req);
  let input: BookingInput;

  try {
    if (formMode) {
      const fd = await req.formData();
      input = parseBody(Object.fromEntries(fd.entries()));
    } else {
      input = parseBody(await req.json());
    }
  } catch {
    if (formMode) {
      return NextResponse.redirect(`${siteUrlFromRequest(req)}/teams?error=invalid_form`, 303);
    }
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const result = await processMemberBooking(input, cookieStore);
  const site = siteUrlFromRequest(req);
  const teamId = input.team_id;

  if (!result.ok) {
    if (formMode) {
      const q = new URLSearchParams({ error: result.error });
      if (result.code === "login_required") q.set("relogin", "1");
      return NextResponse.redirect(`${site}/book/${teamId}?${q.toString()}`, 303);
    }

    const status =
      result.code === "login_required"
        ? 401
        : result.code === "credit_blocked"
          ? 403
          : result.code === "not_found"
            ? 404
            : 400;

    return NextResponse.json(
      {
        error: result.code === "credit_blocked" ? "credit_blocked" : result.error,
        message: result.error,
        credit_score: result.credit_score,
        no_show_count: result.no_show_count,
      },
      { status }
    );
  }

  const res = formMode
    ? NextResponse.redirect(
        `${site}/book/result?status=ok&id=${result.booking.id}&team=${teamId}`,
        303
      )
    : NextResponse.json({ booking: result.booking });

  setMemberProfileCookies(res, result.profile);
  return res;
}
