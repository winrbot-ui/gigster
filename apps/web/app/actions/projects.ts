"use server";

import { revalidatePath } from "next/cache";
import {
  emptyProjectJson,
  isBriefReady,
  canUsePlatform,
  platformLimitMessage,
  type ProjectPlatform,
} from "@gigster/shared-types";
import { createClient } from "@/lib/supabase/server";
import { backendFetch } from "@/lib/api";
import { requireActive } from "@/lib/auth";
import { getPlatformLimitContext } from "@/lib/platform-limits";

export type ProjectActionState = { error?: string; success?: string };

export async function createProject(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireActive();
  const platform = String(formData.get("platform") ?? "") as ProjectPlatform;
  const clientName = String(formData.get("client_name") ?? "").trim();

  if (!["upwork", "fiverr", "freelancer"].includes(platform)) {
    return { error: "Select a platform." };
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
  await requireActive();
  const cleaned = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!cleaned) return { error: "Invalid slug." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ preview_slug: cleaned })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath("/projects");
  return { success: "Preview slug updated." };
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

async function generateBrief(projectId: string): Promise<ProjectActionState> {
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
    const res = await backendFetch("/ai/brief", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { detail?: string };
      return { error: body.detail ?? "Brief generation failed." };
    }
    revalidatePath("/projects");
    return { success: "Brief generated. Agent 2 build queued." };
  } catch {
    return { error: "Backend unavailable. Set GIGSTER_API_URL and start the API." };
  }
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
      return { error: body.detail ?? "Agent 2 retry failed." };
    }
    revalidatePath("/projects");
    return { success: "Agent 2 rebuild started." };
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
