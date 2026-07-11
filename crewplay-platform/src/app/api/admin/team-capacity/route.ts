import { NextResponse } from "next/server";
import { verifyAdminKey } from "@/lib/analytics-store";
import { listTeamCapacityOverrides, setTeamCapacityOverride } from "@/lib/team-capacity-overrides";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }
  const teamCapacityById = await listTeamCapacityOverrides();
  return NextResponse.json({ teamCapacityById });
}

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { team_id?: string; capacity?: number | null | string }
    | null;
  const teamId = String(body?.team_id ?? "").trim();
  if (!teamId) {
    return NextResponse.json({ error: "缺少 team_id" }, { status: 400 });
  }

  if (body?.capacity == null || body.capacity === "") {
    await setTeamCapacityOverride(teamId, null);
    return NextResponse.json({ ok: true, team_id: teamId, capacity: null });
  }

  const capacity = Number(body.capacity);
  if (!Number.isFinite(capacity) || capacity <= 0 || capacity > 200) {
    return NextResponse.json({ error: "capacity 必須為 1~200 的數字" }, { status: 400 });
  }

  await setTeamCapacityOverride(teamId, Math.floor(capacity));
  return NextResponse.json({ ok: true, team_id: teamId, capacity: Math.floor(capacity) });
}
