import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { migrateLegacyPersonaIfNeeded } from "@/app/actions/persona";
import { PersonaForm } from "@/components/app/persona-form";
import { sanitizePersonaFields } from "@gigster/shared-types";

export const metadata: Metadata = {
  title: "Agent setup",
};

export default async function AgentSetupPage() {
  const user = await requireMember();
  const { migrated } = await migrateLegacyPersonaIfNeeded(user.id);
  const supabase = await createClient();
  const { data: personaRaw } = await supabase
    .from("agent_personas")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const persona = personaRaw ? sanitizePersonaFields(personaRaw) : null;

  return <PersonaForm persona={persona} showLegacyNotice={migrated} />;
}
