import type { ProjectPlatform } from "@gigster/shared-types";
import { platformLimitMessage } from "@gigster/shared-types";
import { createClient } from "@/lib/supabase/server";

export async function getPlatformLimitContext(userId: string) {
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("platforms_allowed, plan")
    .eq("user_id", userId)
    .eq("active", true)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  const platformsAllowed = sub?.platforms_allowed ?? 1;

  return {
    platformsAllowed,
    usedPlatforms,
    plan: sub?.plan ?? null,
    limitMessage: platformLimitMessage(platformsAllowed),
  };
}
