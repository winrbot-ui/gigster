import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PersonaForm } from "@/components/app/persona-form";

export const metadata: Metadata = {
  title: "Agent setup",
};

export default async function AgentSetupPage() {
  const user = await requireActive();
  const supabase = await createClient();
  const { data: persona } = await supabase
    .from("agent_personas")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return <PersonaForm persona={persona} />;
}
