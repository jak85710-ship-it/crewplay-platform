import { notFound } from "next/navigation";

import { CheckInStaffPanel } from "@/components/CheckInStaffPanel";
import { getBookingById } from "@/lib/bookings";
import { verifyCheckInToken } from "@/lib/check-in-token";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

interface Props {
  searchParams: Promise<{ t?: string }>;
}

export default async function CheckInScanPage({ searchParams }: Props) {
  const { t } = await searchParams;
  const payload = verifyCheckInToken(t);
  if (!payload) notFound();

  const booking = await getBookingById(payload.bookingId);
  if (!booking) notFound();

  const teamRaw = await getTeamById(booking.team_id);
  const team = teamRaw ? enrichTeamFromIntro(teamRaw) : null;

  return (
    <CheckInStaffPanel
      token={t ?? ""}
      booking={booking}
      team={
        team
          ? {
              arena_name: team.arena_name,
              sport: team.sport,
              region: team.region,
              location: team.location,
            }
          : null
      }
    />
  );
}
