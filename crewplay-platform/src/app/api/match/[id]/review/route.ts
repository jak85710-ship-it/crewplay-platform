import { NextResponse } from "next/server";

import { submitMatchReview } from "@/lib/matches";
import { isMemberKeyResult, requireMemberKey } from "@/lib/require-member-api";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireMemberKey();
  if (!isMemberKeyResult(auth)) return auth;

  const { id } = await params;
  const body = await req.json();

  const result = await submitMatchReview({
    matchId: id,
    reviewerMemberKey: auth.memberKey,
    skillMatch: body.skill_match === true,
    isHarassment: body.is_harassment === true,
    isNoShow: body.is_no_show === true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, review: result.review });
}
