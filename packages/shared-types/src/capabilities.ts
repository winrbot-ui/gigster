/**
 * Agent capabilities — single source of truth for what Agent 1 may offer
 * and what Agent 2 can build. Keep in sync with apps/backend/app/services/ai/capabilities.py
 */

export interface AgentOffering {
  id: string;
  label: string;
  description: string;
  template: string;
  /** Typical section kinds used in this offering */
  sections: string[];
}

export interface AgentCapability {
  id: string;
  label: string;
  description: string;
}

export interface AgentNonCapability {
  id: string;
  group: string;
  label: string;
  description: string;
  /** What Agent 1 should suggest instead */
  alternative: string;
}

/** Five core offerings members can sell — each maps to an Agent 2 template. */
export const AGENT_OFFERINGS: AgentOffering[] = [
  {
    id: "business",
    label: "Business website",
    description:
      "Multi-page sites for local businesses and companies — services, about, team, FAQ, pricing, contact.",
    template: "business",
    sections: [
      "hero",
      "services",
      "about_story",
      "team",
      "stats",
      "features",
      "process",
      "faq",
      "pricing",
      "testimonials",
      "gallery",
      "contact_form",
      "map",
      "hours",
      "social_links",
    ],
  },
  {
    id: "landing",
    label: "Landing page",
    description:
      "High-converting single-page sites for a product, campaign, or offer — hero, features, proof, CTA, video.",
    template: "landing",
    sections: [
      "hero",
      "features",
      "stats",
      "testimonials",
      "pricing",
      "video",
      "faq",
      "cta",
      "contact_form",
      "social_links",
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant & café",
    description:
      "Menus with categories and prices, gallery, opening hours, location map, reservations via embed.",
    template: "restaurant",
    sections: [
      "hero",
      "menu",
      "gallery",
      "hours",
      "map",
      "about_story",
      "testimonials",
      "booking_embed",
      "contact_form",
      "social_links",
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio & personal brand",
    description:
      "Showcase sites for photographers, designers, and freelancers — gallery, about, services, social proof.",
    template: "portfolio",
    sections: [
      "hero",
      "gallery",
      "about_story",
      "services",
      "testimonials",
      "process",
      "contact_form",
      "social_links",
      "cta",
    ],
  },
  {
    id: "event",
    label: "Event & promo",
    description:
      "Event pages for weddings, openings, and local promos — schedule, location, RSVP via embed, countdown info.",
    template: "event",
    sections: [
      "hero",
      "about_story",
      "process",
      "map",
      "gallery",
      "faq",
      "booking_embed",
      "contact_form",
      "social_links",
      "cta",
    ],
  },
];

/** Section-level building blocks Agent 2 can render. */
export const AGENT_CAPABILITIES: AgentCapability[] = [
  { id: "hero", label: "Hero banner", description: "Headline, subheadline, and call-to-action." },
  { id: "services", label: "Services list", description: "Grid of services with titles and descriptions." },
  { id: "about_story", label: "About / story", description: "Brand story and background paragraphs." },
  { id: "team", label: "Team", description: "Team member cards with name and role." },
  { id: "contact_form", label: "Contact form", description: "Name, email, message form (UI only on preview)." },
  { id: "cta", label: "Call to action", description: "Prominent button block to drive contact." },
  { id: "faq", label: "FAQ", description: "Expandable question and answer list." },
  { id: "pricing", label: "Pricing tables", description: "Plans with price and feature bullets." },
  { id: "gallery", label: "Photo gallery", description: "Image grid with captions." },
  { id: "testimonials", label: "Testimonials", description: "Client quotes and author names." },
  { id: "menu", label: "Restaurant menu", description: "Categories with items, prices, descriptions." },
  { id: "embed", label: "Custom embed", description: "YouTube, Vimeo, or other iframe embeds." },
  { id: "blog_list", label: "Blog list", description: "Static list of posts with title and excerpt." },
  { id: "stats", label: "Stats / numbers", description: "Key metrics (clients served, years in business)." },
  { id: "features", label: "Features grid", description: "Benefits or features with icons and copy." },
  { id: "process", label: "How it works", description: "Step-by-step process (1-2-3)." },
  { id: "video", label: "Video embed", description: "YouTube or Vimeo showcase video." },
  { id: "map", label: "Location map", description: "Google Maps embed for address." },
  { id: "hours", label: "Opening hours", description: "Weekly schedule for local businesses." },
  { id: "social_links", label: "Social links", description: "Instagram, Facebook, TikTok, LinkedIn, WhatsApp." },
  { id: "logos", label: "Partner logos", description: "Client or partner logo strip." },
  { id: "booking_embed", label: "Booking embed", description: "Calendly or Cal.com scheduling iframe." },
  { id: "newsletter", label: "Newsletter signup", description: "Email capture form or embed." },
];

/** Out-of-scope requests — Agent 1 must decline and offer the alternative. */
export const AGENT_NON_CAPABILITIES: AgentNonCapability[] = [
  {
    id: "wordpress",
    group: "Platforms & CMS",
    label: "WordPress / Wix / Webflow / Shopify / Squarespace / Framer",
    description: "We do not build, migrate, or maintain sites on third-party CMS or store platforms.",
    alternative:
      "I build a fast custom static site with the same pages and design — no WordPress needed.",
  },
  {
    id: "ecommerce",
    group: "E-commerce",
    label: "Online store, cart, checkout, payments, inventory",
    description: "No shopping cart, payment processing, or product inventory systems.",
    alternative:
      "I can add a pricing section and contact form so clients inquire — or link to an existing store.",
  },
  {
    id: "mobile_app",
    group: "Applications",
    label: "Mobile apps (iOS/Android), desktop apps, SaaS web apps",
    description: "No native apps or complex web applications with custom logic.",
    alternative: "A mobile-friendly marketing website that works perfectly on phones.",
  },
  {
    id: "auth_backend",
    group: "Backend & data",
    label: "Login, user accounts, membership portals, databases, custom APIs",
    description: "No authentication, user databases, or custom backend development.",
    alternative: "A professional public-facing site; members use external tools for accounts if needed.",
  },
  {
    id: "realtime",
    group: "Live & dynamic",
    label: "Real-time chat, forums, comments, multi-vendor marketplaces",
    description: "No live interactive features that need a server.",
    alternative: "Contact form, WhatsApp link, or Calendly embed for communication.",
  },
  {
    id: "custom_booking",
    group: "Booking",
    label: "Custom booking/reservation system (our backend)",
    description: "We cannot build a proprietary booking engine.",
    alternative: "Calendly or Cal.com embedded on the site — clients book through that.",
  },
  {
    id: "marketing_services",
    group: "Marketing services",
    label: "SEO guarantees, ad management, social media management, monthly blog writing",
    description: "We deliver the website only — not ongoing marketing retainers.",
    alternative: "SEO-friendly site structure and meta tags; you handle ads and social separately.",
  },
  {
    id: "other",
    group: "Other",
    label: "Crypto/web3, email servers, hosting migration, fixing someone else's site",
    description: "Out of scope for our static site builder.",
    alternative: "A new site built to your brief from scratch.",
  },
];

export const SPECIALTY_SUGGESTIONS = [
  "Custom static business sites and landing pages",
  "Business websites",
  "Landing pages",
  "Restaurant & café sites",
  "Portfolio & personal brand",
  "Event & promo pages",
  "Local service businesses (garage, salon, clinic)",
  "Static marketing sites",
] as const;

export const TONE_SUGGESTIONS = [
  "Friendly and professional",
  "Casual and direct",
  "Formal and polished",
  "Warm and conversational",
  "Confident and concise",
] as const;

/** Blocker regex patterns for validate.py — keep in sync with capabilities.py */
export const CAPABILITY_BLOCKER_PATTERNS: string[] = [
  "\\bwordpress\\b",
  "\\bwix\\b",
  "\\bwebflow\\b",
  "\\bshopify\\b",
  "\\bwoocommerce\\b",
  "\\bsquarespace\\b",
  "\\bframer\\s+(site|website|cms)\\b",
  "\\be[\\s-]?commerce\\b",
  "\\bonline\\s+store\\b",
  "\\bshopping\\s+cart\\b",
  "\\bcheckout\\b",
  "\\bpayment\\s+(gateway|processing)\\b",
  "\\bmobile\\s+app\\b",
  "\\bios\\s+app\\b",
  "\\bandroid\\s+app\\b",
  "\\bweb\\s+app\\b",
  "\\bsaas\\b",
  "\\buser\\s+account",
  "\\bmembership\\s+portal\\b",
  "\\bcustom\\s+backend\\b",
  "\\bapi\\s+endpoint\\b",
  "\\breal[\\s-]?time\\b",
  "\\bwebsocket\\b",
  "\\bbooking\\s+system\\b",
  "\\breservation\\s+system\\b",
  "\\bblockchain\\s+(platform|development|app)\\b",
  "\\bsmart\\s+contract\\b",
  "\\bdapp\\b",
  "\\bnft\\s+(marketplace|minting|platform)\\b",
];
