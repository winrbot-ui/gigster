import type { ProjectPlatform } from "./enums";

/** Whether the user may create/monitor on this platform given their plan limit. */
export function canUsePlatform(
  platformsAllowed: number,
  usedPlatforms: readonly ProjectPlatform[],
  platform: ProjectPlatform,
): boolean {
  if (usedPlatforms.includes(platform)) return true;
  return usedPlatforms.length < platformsAllowed;
}

export function platformLimitMessage(platformsAllowed: number): string {
  if (platformsAllowed <= 1) {
    return "Your Basic plan allows 1 platform (Upwork, Fiverr, or Freelancer). Upgrade to Pro for all 3.";
  }
  return `Your plan allows ${platformsAllowed} platforms. Remove a project on another platform or upgrade.`;
}
