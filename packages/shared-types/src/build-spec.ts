/**
 * Agent 2 contract. build_spec is the validated, buildable description of a
 * site that Agent 2 turns into a deployed preview at slug.gigsterr.online.
 */

/** Fixed section vocabulary. Agent 2 may only emit these section kinds. */
export const SECTION_KINDS = [
  "hero",
  "services",
  "about_story",
  "team",
  "contact_form",
  "cta",
  "faq",
  "pricing",
  "gallery",
  "testimonials",
  "menu",
  "embed",
  "blog_list",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

/** Templates Agent 2 can pick from. */
export const BUILD_TEMPLATES = ["business", "landing", "restaurant"] as const;
export type BuildTemplate = (typeof BUILD_TEMPLATES)[number];

export interface BuildSection {
  kind: SectionKind;
  /** Section-specific content; shape depends on `kind`. */
  content: Record<string, unknown>;
}

export interface BuildPage {
  slug: string;
  title: string;
  sections: BuildSection[];
}

export interface BuildSpec {
  template: BuildTemplate;
  site_name: string;
  tagline: string | null;
  /** Multi-page sites (preferred for business template). */
  pages?: BuildPage[];
  /** Legacy single-page layout when `pages` is omitted. */
  sections?: BuildSection[];
  /** Brand palette / theme hints. */
  theme: {
    primary: string | null;
    accent: string | null;
    dark: boolean;
  };
  contact: {
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}
