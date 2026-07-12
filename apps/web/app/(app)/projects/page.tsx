import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getProjects } from "@/app/actions/projects";
import { getPlatformLimitContext } from "@/lib/platform-limits";
import { ProjectsView } from "@/components/app/projects-view";
import type { ProjectRow } from "@gigster/shared-types";

export const metadata: Metadata = {
  title: "Clients",
};

export default async function ProjectsPage() {
  const user = await requireMember();
  const [projects, platformLimits] = await Promise.all([
    getProjects(user.id),
    getPlatformLimitContext(user.id),
  ]);
  return (
    <ProjectsView
      projects={(projects ?? []) as ProjectRow[]}
      platformsAllowed={platformLimits.platformsAllowed}
      usedPlatforms={platformLimits.usedPlatforms}
      limitMessage={platformLimits.limitMessage}
    />
  );
}
