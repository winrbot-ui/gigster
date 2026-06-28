import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { getProjects } from "@/app/actions/projects";
import { ProjectsView } from "@/components/app/projects-view";
import type { ProjectRow } from "@gigster/shared-types";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const user = await requireActive();
  const projects = await getProjects(user.id);
  return <ProjectsView projects={(projects ?? []) as ProjectRow[]} />;
}
