import type { ProjectPlatform } from "./enums";

/** Whether a marketplace is selectable for new projects. */
export type PlatformAvailability = "available" | "coming_soon";

export interface PlatformMeta {
  id: ProjectPlatform;
  label: string;
  availability: PlatformAvailability;
}

/** Canonical platform list for UI and backend validation. */
export const PLATFORM_CATALOG: readonly PlatformMeta[] = [
  { id: "fiverr", label: "Fiverr", availability: "available" },
  { id: "freelancer", label: "Freelancer", availability: "available" },
  { id: "upwork", label: "Upwork", availability: "coming_soon" },
] as const;

/** Platforms users may create or monitor projects on (excludes `coming_soon`). */
export const ACTIVE_PLATFORMS: readonly ProjectPlatform[] = ["fiverr", "freelancer"];

export function platformAvailability(platform: ProjectPlatform): PlatformAvailability {
  const meta = PLATFORM_CATALOG.find((p) => p.id === platform);
  return meta?.availability ?? "coming_soon";
}

export function isPlatformAvailable(platform: ProjectPlatform): boolean {
  return platformAvailability(platform) === "available";
}

/** Whether the user may create/monitor on this platform given their plan limit. */
export function canUsePlatform(
  platformsAllowed: number,
  usedPlatforms: readonly ProjectPlatform[],
  platform: ProjectPlatform,
): boolean {
  if (!isPlatformAvailable(platform)) return false;
  if (usedPlatforms.includes(platform)) return true;
  return usedPlatforms.length < platformsAllowed;
}

export function platformLimitMessage(platformsAllowed: number): string {
  if (platformsAllowed <= 1) {
    return "Your Basic plan allows 1 platform (Fiverr or Freelancer). Upgrade to Pro for both.";
  }
  return "Your Pro plan allows Fiverr and Freelancer. Upwork is coming soon.";
}
