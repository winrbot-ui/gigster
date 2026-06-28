/**
 * Agent persona — the live identity Agent 1 uses when drafting replies.
 * Read live from the DB (never cached) so edits take effect immediately.
 */
export interface AgentPersona {
  agent_name: string;
  full_name: string;
  title: string;
  specialty: string;
  tone: string;
  experience_years: number;
  location: string;
  /** Phrases the persona must never use. */
  never_say: string[];
  /** Behavioural guidance the persona must always follow. */
  always_do: string;
}
