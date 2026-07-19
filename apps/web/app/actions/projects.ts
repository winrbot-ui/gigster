"use server";

import { revalidatePath } from "next/cache";
import {
  emptyProjectJson,
  isBriefReady,
  canUsePlatform,
  isPlatformAvailable,
  platformLimitMessage,
  type BriefDecisionAction,
  type ProjectPlatform,
} from "@gigster/shared-types";
import { createClient } from "@/lib/supabase/server";
import { backendFetch } from "@/lib/api";
import { requireActive, requireMember } from "@/lib/auth";
import { getPlatformLimitContext } from "@/lib/platform-limits";

export type ProjectActionState = { error?: string; success?: string };

export async function createProject(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireMember();
  const platform = String(formData.get("platform") ?? "") as ProjectPlatform;
  const clientName = String(formData.get("client_name") ?? "").trim();

  if (!isPlatformAvailable(platform)) {
    return { error: "Upwork is coming soon — choose Fiverr or Freelancer." };
  }
  if (!clientName) return { error: "Client name is required." };

  const { platformsAllowed, usedPlatforms } = await getPlatformLimitContext(user.id);
  if (!canUsePlatform(platformsAllowed, usedPlatforms, platform)) {
    return { error: platformLimitMessage(platformsAllowed) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    platform,
    client_name: clientName,
    status: "new",
    project_json: emptyProjectJson(),
    brief_score: 0,
    agent2_status: "idle",
  });

  if (error) return { error: error.message };
  revalidatePath("/projects");
  return { success: "Project created." };
}

export async function updatePreviewSlug(
  projectId: string,
  slug: string,
): Promise<ProjectActionState> {
  await requireMember();
  const cleaned = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!cleaned) return { error: "Invalid slug." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ preview_slug: cleaned })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath("/projects");
  return { success: "Site address updated." };
}

export async function updatePreviewSlugAction(
  projectId: string,
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const slug = String(formData.get("slug") ?? "");
  return updatePreviewSlug(projectId, slug);
}

export async function generateBriefAction(
  projectId: string,
): Promise<ProjectActionState> {
  return generateBrief(projectId);
}

export async function submitBriefDecisionAction(
  projectId: string,
  action: BriefDecisionAction,
): Promise<ProjectActionState> {
  const user = await requireActive();

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return { error: "Project not found." };

  const pj = project.project_json ?? emptyProjectJson();
  if (
    !isBriefReady({
      brief_score: project.brief_score ?? 0,
      status: pj.status ?? project.status,
      client_confirmed: pj.client_confirmed ?? false,
    })
  ) {
    return { error: "Brief not ready. Score must be ≥85, status deal, client confirmed." };
  }

  try {
    const res = await backendFetch("/ext/brief/decision", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, action }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { detail?: string };
      return { error: body.detail ?? "Brief decision failed." };
    }
    revalidatePath("/projects");
    const labels: Record<BriefDecisionAction, string> = {
      build: "Project site build queued.",
      document: "Brief document ready — download from the project card.",
      both: "Build queued and brief document ready.",
    };
    return { success: labels[action] };
  } catch {
    return { error: "Backend unavailable. Set GIGSTER_API_URL and start the API." };
  }
}

export async function briefDecisionFormAction(
  projectId: string,
  action: BriefDecisionAction,
  _prev: ProjectActionState,
  _formData: FormData,
): Promise<ProjectActionState> {
  return submitBriefDecisionAction(projectId, action);
}

async function generateBrief(projectId: string): Promise<ProjectActionState> {
  return submitBriefDecisionAction(projectId, "build");
}

export async function generateBriefFormAction(
  projectId: string,
  _prev: ProjectActionState,
  _formData: FormData,
): Promise<ProjectActionState> {
  return generateBriefAction(projectId);
}

export async function retryAgent2Action(
  projectId: string,
): Promise<ProjectActionState> {
  await requireActive();

  try {
    const res = await backendFetch("/agent2/retry", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { detail?: string };
      return { error: body.detail ?? "Site build retry failed." };
    }
    revalidatePath("/projects");
    return { success: "Site rebuild started." };
  } catch {
    return { error: "Backend unavailable." };
  }
}

export async function updatePreviewSlugFormAction(
  projectId: string,
  prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  return updatePreviewSlugAction(projectId, prev, formData);
}

export async function getProjects(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
