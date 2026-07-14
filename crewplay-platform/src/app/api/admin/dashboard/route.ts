import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { listBookings } from "@/lib/bookings";
import { getLineHostRecipientsConfig } from "@/lib/line-host-recipients";
import { listTeamCapacityOverrides } from "@/lib/team-capacity-overrides";
import { getAllTeams } from "@/lib/teams";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const [teams, bookings, teamCapacityOverrides, lineHostRecipients] = await Promise.all([
      getAllTeams(),
      listBookings(),
      listTeamCapacityOverrides(),
      getLineHostRecipientsConfig(),
    ]);
    const sports = [...new Set(teams.map((t) => t.sport))];

    return NextResponse.json({
      ok: true,
      stats: {
        teams: teams.length,
        sports: sports.length,
        bookings: bookings.length,
      },
      teams,
      teamCapacityOverrides,
      lineHostGlobalRecipients: lineHostRecipients.globalRecipients,
      lineHostRecipientsByTeam: lineHostRecipients.byTeam,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "載入後台資料失敗" },
      { status: 500 }
    );
  }
}
