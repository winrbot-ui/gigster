"use server";

import { revalidatePath } from "next/cache";
import type { AgentPersona } from "@gigster/shared-types";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";

export type PersonaActionState = { error?: string; success?: string };

export async function savePersona(
  _prev: PersonaActionState,
  formData: FormData,
): Promise<PersonaActionState> {
  const user = await requireMember();

  const neverSayRaw = String(formData.get("never_say") ?? "");
  const persona: Omit<AgentPersona, "user_id"> = {
    agent_name: String(formData.get("agent_name") ?? "").trim(),
    full_name: String(formData.get("full_name") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    specialty: String(formData.get("specialty") ?? "").trim(),
    tone: String(formData.get("tone") ?? "").trim(),
    experience_years: Number(formData.get("experience_years") ?? 0),
    location: String(formData.get("location") ?? "").trim(),
    never_say: neverSayRaw
      ? neverSayRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    always_do: String(formData.get("always_do") ?? "").trim(),
  };

  if (!persona.agent_name) return { error: "Agent name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("agent_personas").upsert({
    user_id: user.id,
    ...persona,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/agent-setup");
  return { success: "Persona saved. Changes apply to the next Generate." };
}

export async function getPersona(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_personas")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
