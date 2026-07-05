"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/security";

export type CustomRequestState = {
  error?: string;
  success?: string;
};

export async function submitCustomRequest(
  _prev: CustomRequestState,
  formData: FormData,
): Promise<CustomRequestState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const business = String(formData.get("business") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");

  if (!name || !email || !description) {
    return { error: "Name, email, and description are required." };
  }

  const turnstileOk = await verifyTurnstile(turnstileToken || null);
  if (!turnstileOk) {
    return { error: "Verification failed. Try again." };
  }

  const sb = createAdminClient();
  const { error } = await sb.from("custom_requests").insert({
    name,
    email,
    business: business || null,
    description,
  });

  if (error) {
    console.error("[custom-request]", error.message);
    return { error: "Could not save request. Try again later." };
  }

  return { success: "Request received — we'll be in touch by email." };
}
