import type { Team } from "@/types";
import type { MemberSession } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";
import { listHostSubmissions } from "@/lib/submissions";
import { getAllTeams } from "@/lib/teams";

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

export function hostIdentityTokens(member: MemberSession): { email?: string; phone?: string } {
  const email = member.email?.trim().toLowerCase();
  const phone = normalizePhone(member.phone || member.contactPhone || "");
  return {
    email: email && email.includes("@") ? email : undefined,
    phone: phone || undefined,
  };
}

export async function listOwnedTeamsForMember(member: MemberSession): Promise<Team[]> {
  if (!member.isLoggedIn) return [];
  const identity = hostIdentityTokens(member);
  if (!identity.email && !identity.phone) return [];

  const [hostSubmissions, teams] = await Promise.all([listHostSubmissions(), getAllTeams()]);

  const mine = hostSubmissions.filter((s) => {
    const emailMatch =
      !!identity.email && !!s.email && s.email.trim().toLowerCase() === identity.email;
    const phoneMatch =
      !!identity.phone && !!s.phone && normalizePhone(s.phone) === identity.phone;
    return emailMatch || phoneMatch;
  });

  const picked = new Map<string, Team>();
  for (const submission of mine) {
    for (const team of teams) {
      if (!nameLikelyMatch(submission.team_name, team.arena_name)) continue;
      const location = normalizeText(submission.location);
      if (location && !normalizeText(team.region).includes(location) && !normalizeText(team.location).includes(location)) {
        continue;
      }
      picked.set(team.id, team);
    }
  }

  return [...picked.values()];
}
