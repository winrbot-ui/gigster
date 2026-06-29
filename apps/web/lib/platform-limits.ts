import type { ProjectPlatform } from "@gigster/shared-types";
import { platformLimitMessage } from "@gigster/shared-types";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription, membershipIsLive } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/auth";

export async function getPlatformLimitContext(userId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const sub = await getUserSubscription(userId);
  const live = user ? membershipIsLive(user, sub) : false;

  const { data: projects } = await supabase
    .from("projects")
    .select("platform")
    .eq("user_id", userId);

  const usedPlatforms = [
    ...new Set(
      (projects ?? [])
        .map((p) => p.platform as ProjectPlatform)
        .filter(Boolean),
    ),
  ];

  const platformsAllowed = live && sub ? sub.platforms_allowed : 1;

  return {
    platformsAllowed,
    usedPlatforms,
    plan: live && sub ? sub.plan : null,
    limitMessage: platformLimitMessage(platformsAllowed),
  };
}
