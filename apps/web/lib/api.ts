import { createClient } from "@/lib/supabase/server";

/**
 * Thin server-side client for the FastAPI backend. Forwards the current user's
 * JWT so the backend can authorize the request. Sensitive logic (AI, persona,
 * payment verify, Agent 2) lives on the backend — never in this app.
 */
export async function backendFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const baseUrl = process.env.GIGSTER_API_URL;
  if (!baseUrl) {
    throw new Error("GIGSTER_API_URL is not set (see .env.example).");
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (session?.access_token) {
    headers.set("authorization", `Bearer ${session.access_token}`);
  }

  return fetch(new URL(path, baseUrl), { ...init, headers });
}
