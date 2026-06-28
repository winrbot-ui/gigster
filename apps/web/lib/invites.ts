import { getSiteUrl } from "./site-url";

export const MEMBER_MONTHLY_INVITES = 3;

export function buildInviteLink(username: string): string {
  const base = getSiteUrl();
  return `${base}/join?ref=${encodeURIComponent(username)}`;
}

export function inviteStatsFromCount(usedThisMonth: number) {
  return {
    usedThisMonth,
    limit: MEMBER_MONTHLY_INVITES,
    remaining: Math.max(0, MEMBER_MONTHLY_INVITES - usedThisMonth),
  };
}
