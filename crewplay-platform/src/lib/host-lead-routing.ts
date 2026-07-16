import type { Team } from "@/types";
import type { MemberSession } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";
import { listHostSubmissions } from "@/lib/submissions";
import { hostIdentityTokens } from "@/lib/host-team-access";
import { getTeamById } from "@/lib/teams";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()（）\[\]【】·．、,，.。\-_/]/g, "");
}

function nameLikelyMatch(teamName: string, arenaName: string): boolean {
  const a = normalizeText(teamName);
  const b = normalizeText(arenaName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function hostLeadIdFromEmail(email: string): string {
  return `host:email:${email.trim().toLowerCase()}`;
}

function hostLeadIdFromPhone(phone: string): string {
  const normalized = normalizePhone(phone) || phone.trim();
  return `host:phone:${normalized}`;
}

export function hostLeadIdCandidatesFromMember(member: MemberSession): string[] {
  const identity = hostIdentityTokens(member);
  const ids: string[] = [];
  if (identity.email) ids.push(hostLeadIdFromEmail(identity.email));
  if (identity.phone) ids.push(hostLeadIdFromPhone(identity.phone));
  if (member.memberKey) ids.push(`host:member:${member.memberKey}`);
  return [...new Set(ids)];
}

export async function resolveHostLeadIdsForTeam(teamId: string): Promise<string[]> {
  const team = await getTeamById(teamId);
  if (!team) return [];
  const submissions = await listHostSubmissions();
  const ids = new Set<string>();

  for (const row of submissions) {
    if (!nameLikelyMatch(row.team_name, team.arena_name)) continue;
    const location = normalizeText(row.location || "");
    if (
      location &&
      !normalizeText(team.region).includes(location) &&
      !normalizeText(team.location).includes(location)
    ) {
      continue;
    }
    if (row.email?.trim()) {
      ids.add(hostLeadIdFromEmail(row.email));
    }
    if (row.phone?.trim()) {
      ids.add(hostLeadIdFromPhone(row.phone));
    }
  }

  return [...ids];
}

export async function resolveTeamFromEventId(eventId: string): Promise<Team | null> {
  return getTeamById(eventId);
}
