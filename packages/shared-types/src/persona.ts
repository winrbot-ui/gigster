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
  /** Fiverr seller username (without @). At least one marketplace handle is required on save. */
  fiverr_username: string;
  /** Freelancer.com username (without @). At least one marketplace handle is required on save. */
  freelancer_username: string;
  /** Phrases the persona must never use. */
  never_say: string[];
  /** Behavioural guidance the persona must always follow. */
  always_do: string;
}

/** Strip @ prefix and whitespace from a marketplace handle. */
export function normalizeMarketplaceUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").trim();
}

/** Agent setup requires at least one marketplace username. */
export function hasRequiredPlatformUsername(
  persona: Partial<AgentPersona> | null | undefined,
): boolean {
  if (!persona) return false;
  return Boolean(
    normalizeMarketplaceUsername(persona.fiverr_username ?? "") ||
      normalizeMarketplaceUsername(persona.freelancer_username ?? ""),
  );
}

/** Short label for admin lists (e.g. "Fiverr: jordan · Freelancer: j_smith"). */
export function formatMarketplaceHandles(
  persona: Partial<AgentPersona> | null | undefined,
): string {
  if (!persona) return "—";
  const parts: string[] = [];
  const fiverr = normalizeMarketplaceUsername(persona.fiverr_username ?? "");
  const freelancer = normalizeMarketplaceUsername(persona.freelancer_username ?? "");
  if (fiverr) parts.push(`Fiverr: ${fiverr}`);
  if (freelancer) parts.push(`Freelancer: ${freelancer}`);
  return parts.length ? parts.join(" · ") : "—";
}

export const DEFAULT_PERSONA_TITLE = "Web Designer";
export const DEFAULT_PERSONA_SPECIALTY =
  "Custom static business sites and landing pages";
export const DEFAULT_PERSONA_ALWAYS_DO =
  "Keep replies short and natural. Match the client's message length.";

const CMS_TERMS = /\b(wordpress|wix|shopify|webflow|squarespace|framer)\b/i;
const CMS_REPLACE =
  /\b(wordpress|wix|shopify|webflow|squarespace|framer)\b/gi;
const LEGACY_ALWAYS_DO_PATTERN =
  /\b(?:client first name|2-5 sentences|max 2 questions)\b/i;
const LEGACY_TITLE = "small business website developer";

function stripCmsTerms(text: string): string {
  return text.replace(CMS_REPLACE, "custom static sites").replace(/\s{2,}/g, " ").trim();
}

/** True when persona still has pre-humanization defaults that cause robotic drafts. */
export function isLegacyPersona(persona: Partial<AgentPersona> | null | undefined): boolean {
  if (!persona) return false;
  const title = (persona.title ?? "").trim().toLowerCase();
  const alwaysDo = persona.always_do ?? "";
  return (
    CMS_TERMS.test(persona.specialty ?? "") ||
    CMS_TERMS.test(persona.title ?? "") ||
    title === LEGACY_TITLE ||
    LEGACY_ALWAYS_DO_PATTERN.test(alwaysDo)
  );
}

/** Sanitize persona fields so Agent 1 does not inherit WordPress or AI-style rules. */
export function sanitizePersonaFields<T extends Partial<AgentPersona>>(persona: T): T {
  const out = { ...persona };
  if (out.specialty && CMS_TERMS.test(out.specialty)) {
    out.specialty = DEFAULT_PERSONA_SPECIALTY;
  } else if (out.specialty) {
    out.specialty = stripCmsTerms(out.specialty);
    if (!out.specialty) out.specialty = DEFAULT_PERSONA_SPECIALTY;
  }
  if (out.title) {
    out.title = stripCmsTerms(out.title);
    if (out.title.trim().toLowerCase() === LEGACY_TITLE) {
      out.title = DEFAULT_PERSONA_TITLE;
    }
  }
  if (out.always_do && LEGACY_ALWAYS_DO_PATTERN.test(out.always_do)) {
    out.always_do = DEFAULT_PERSONA_ALWAYS_DO;
  }
  return out;
}
