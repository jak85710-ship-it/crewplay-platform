import { notFound } from "next/navigation";

import { HostCheckInPortal } from "@/components/HostCheckInPortal";
import { verifyHostPortalToken } from "@/lib/host-portal-token";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

interface Props {
  searchParams: Promise<{ t?: string }>;
}

export default async function CheckInHostPage({ searchParams }: Props) {
  const { t } = await searchParams;
  const portal = verifyHostPortalToken(t);
  if (!portal) notFound();

  const teamRaw = await getTeamById(portal.teamId);
  if (!teamRaw) notFound();
  const team = enrichTeamFromIntro(teamRaw);

  return (
    <HostCheckInPortal
      portalToken={t ?? ""}
      team={{
        id: team.id,
        arena_name: team.arena_name,
        sport: team.sport,
        region: team.region,
        location: team.location,
      }}
    />
  );
}
