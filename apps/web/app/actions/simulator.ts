"use server";

import { backendFetch } from "@/lib/api";
import { requireMember } from "@/lib/auth";

export type SimulatorThreadMessage = {
  role: "client" | "assistant";
  text: string;
  sent_at?: string | null;
};

export type SimulatorReadiness = {
  ready?: boolean;
  score?: number;
  missing?: string[];
  status?: string;
  client_confirmed?: boolean;
  [key: string]: unknown;
};

export type ThreadResult = {
  draft?: string;
  ai_mode?: string;
  project_id?: string;
  brief_score?: number;
  stage?: string;
  readiness?: SimulatorReadiness;
  project_json?: Record<string, unknown>;
  message_count?: number;
  messages_inserted?: number;
  payment_required?: boolean;
  awaiting_brief_decision?: boolean;
  is_new_project?: boolean;
  synced?: boolean;
};

export type Agent2Status = {
  status?: string;
  preview_url?: string | null;
  preview_slug?: string | null;
  running?: boolean;
  error?: string | null;
};

type ThreadOk = { ok: true; data: ThreadResult };
type ThreadErr = { ok: false; error: string };

async function postThread(body: Record<string, unknown>): Promise<ThreadOk | ThreadErr> {
  await requireMember();
  try {
    const res = await backendFetch("/ext/thread", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      return {
        ok: false,
        error: err.detail ?? `Thread request failed (${res.status})`,
      };
    }
    const data = (await res.json()) as ThreadResult;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: "Backend unavailable. Set GIGSTER_API_URL and start the API.",
    };
  }
}

export async function simulateThread(input: {
  platform: string;
  thread_id: string;
  client_name: string;
  messages: SimulatorThreadMessage[];
}): Promise<ThreadOk | ThreadErr> {
  return postThread({
    platform: input.platform,
    thread_id: input.thread_id,
    client_name: input.client_name,
    messages: input.messages,
    mode: "manual",
    sync_only: false,
  });
}

export async function sendApprovedDraft(input: {
  platform: string;
  thread_id: string;
  client_name: string;
  messages: SimulatorThreadMessage[];
  draft_text: string;
}): Promise<ThreadOk | ThreadErr> {
  return postThread({
    platform: input.platform,
    thread_id: input.thread_id,
    client_name: input.client_name,
    messages: input.messages,
    mode: "manual",
    sync_only: true,
    pending_assistant_text: input.draft_text,
  });
}

export async function getAgent2StatusAction(
  projectId: string,
): Promise<{ ok: true; data: Agent2Status } | { ok: false; error: string }> {
  await requireMember();
  try {
    const res = await backendFetch(
      `/ext/agent2/status?project_id=${encodeURIComponent(projectId)}`,
      { method: "GET" },
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      return {
        ok: false,
        error: err.detail ?? `Status request failed (${res.status})`,
      };
    }
    const data = (await res.json()) as Agent2Status;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Backend unavailable." };
  }
}
