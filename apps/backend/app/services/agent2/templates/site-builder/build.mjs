import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(__dirname, "data", "site.json"), "utf8");
const data = JSON.parse(raw.replace(/^\uFEFF/, ""));

const primary = data.theme?.primary || "#0f172a";
const accent = data.theme?.accent || "#c8a86a";
const dark = Boolean(data.theme?.dark);
const bg = dark ? "#0b0b10" : "#ffffff";
const bgAlt = dark ? "#121219" : "#f6f7f9";
const fg = dark ? "#f5f5f7" : "#12131a";
const muted = dark ? "#9ca3af" : "#5b6472";
const cardBg = dark ? "#16161f" : "#ffffff";
const border = dark ? "rgba(255,255,255,0.09)" : "rgba(15,19,26,0.08)";

const template = data.template || "business";

// Font pairing per template. headingParam/bodyParam feed the Google Fonts URL;
// family names are referenced from CSS variables so headings actually use them.
const FONTS = {
  business: {
    headingFamily: "Playfair Display",
    headingParam: "Playfair+Display:wght@500;600;700",
    bodyFamily: "Inter",
    bodyParam: "Inter:wght@400;500;600;700",
  },
  landing: {
    headingFamily: "Space Grotesk",
    headingParam: "Space+Grotesk:wght@500;600;700",
    bodyFamily: "Inter",
    bodyParam: "Inter:wght@400;500;600;700",
  },
  restaurant: {
    headingFamily: "DM Serif Display",
    headingParam: "DM+Serif+Display:ital@0;1",
    bodyFamily: "Inter",
    bodyParam: "Inter:wght@400;500;600",
  },
  portfolio: {
    headingFamily: "Space Grotesk",
    headingParam: "Space+Grotesk:wght@500;600;700",
    bodyFamily: "Inter",
    bodyParam: "Inter:wght@400;500;600",
  },
  event: {
    headingFamily: "Playfair Display",
    headingParam: "Playfair+Display:wght@500;600;700",
    bodyFamily: "Inter",
    bodyParam: "Inter:wght@400;500;600",
  },
}[template] || {
  headingFamily: "Inter",
  headingParam: "Inter:wght@600;700",
  bodyFamily: "Inter",
  bodyParam: "Inter:wght@400;500;600",
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Curated professional Unsplash photos — picked deterministically by keyword so
// images vary across sections instead of repeating one stock photo.
const PHOTO_POOL = [
  "1497366216548-37526070297c",
  "1522071820081-009f0129c71c",
  "1600880292203-757bb62b4baf",
  "1552664730-d307ca884978",
  "1521737604893-d14cc237f11d",
  "1531482615713-2afd69097998",
  "1486406146926-c627a92ad1ab",
  "1497215728101-856f4ea42174",
  "1454165804606-c3d57bc86b40",
  "1519389950473-47ba0277781c",
  "1556761175-b413da4baf72",
  "1542744173-8e7e53415bb0",
  "1600585154340-be6161a56a0c",
  "1441986300917-64674bd600d8",
  "1517048676732-d65bc937f952",
];

function hashKeyword(str) {
  let h = 0;
  const s = String(str || "site");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function photo(keyword, w = 800, h = 600) {
  const id = PHOTO_POOL[hashKeyword(keyword) % PHOTO_POOL.length];
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

function isAllowedIframe(url) {
  const u = String(url || "").toLowerCase();
  return (
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("vimeo.com") ||
    u.includes("calendly.com") ||
    u.includes("cal.com") ||
    u.includes("google.com/maps") ||
    u.includes("maps.google")
  );
}

function renderIframe(url, title = "Embed") {
  if (!url || !isAllowedIframe(url)) {
    return `<p class="muted">${esc(url || "Embed URL")}</p>`;
  }
  return `<div class="embed-wrap"><iframe src="${esc(url)}" title="${esc(title)}" loading="lazy" allowfullscreen></iframe></div>`;
}

function normalizePages(spec) {
  if (Array.isArray(spec.pages) && spec.pages.length > 0) {
    return spec.pages.map((p) => ({
      slug: String(p.slug || "page").toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      title: p.title || p.slug || "Page",
      sections: Array.isArray(p.sections) ? p.sections : [],
    }));
  }
  return [{ slug: "home", title: "Home", sections: Array.isArray(spec.sections) ? spec.sections : [] }];
}

function pageFile(slug) {
  return slug === "home" ? "index.html" : `${slug}.html`;
}

function contactHref(pages) {
  const contact = pages.find((p) => p.slug === "contact");
  return contact ? pageFile("contact") : "#contact";
}

const pages = normalizePages(data);
const contactLink = contactHref(pages);
const siteKeyword = data.site_name || data.tagline || "business";

function sectionHeader(title, subtitle, eyebrow) {
  if (!title && !subtitle && !eyebrow) return "";
  return `<div class="sec-head reveal">
    ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}
    ${title ? `<h2>${esc(title)}</h2>` : ""}
    ${subtitle ? `<p class="sec-sub">${esc(subtitle)}</p>` : ""}
  </div>`;
}

// Full-bleed band wrapper. `alt` toggles the alternating background.
function block(inner, { id = "", alt = false, extra = "" } = {}) {
  return `<section class="block ${alt ? "block-alt" : ""} ${extra}"${id ? ` id="${id}"` : ""}><div class="wrap">${inner}</div></section>`;
}

function renderSection(section, pageSlug, alt) {
  const kind = section.kind;
  const c = section.content || {};
  const ctaTarget = pageSlug === "contact" ? "#contact" : contactLink;

  switch (kind) {
    case "hero": {
      const variant = c.variant || "center";
      const bgImg = c.background_image || photo(siteKeyword, 1920, 1080);
      const ctaLabel = c.cta || c.cta_text || c.button_text;
      const ctaHref = c.cta_url || c.button_url || ctaTarget;
      const secondary = c.secondary_cta || c.secondary_text;
      const secondaryHref = c.secondary_url || contactLink;
      return `<header class="hero hero-${esc(variant)} reveal" style="--hero-bg:url('${esc(bgImg)}')">
        <div class="hero-overlay"></div>
        <div class="hero-inner">
          ${c.eyebrow ? `<span class="eyebrow eyebrow-light">${esc(c.eyebrow)}</span>` : ""}
          <h1>${esc(c.headline || data.site_name)}</h1>
          <p class="sub">${esc(c.subheadline || data.tagline || "")}</p>
          <div class="hero-cta">
            ${ctaLabel ? `<a class="btn" href="${esc(ctaHref)}">${esc(ctaLabel)}</a>` : ""}
            ${secondary ? `<a class="btn btn-ghost" href="${esc(secondaryHref)}">${esc(secondary)}</a>` : ""}
          </div>
        </div>
      </header>`;
    }
    case "services": {
      const items = c.items || [];
      const lis = items.length
        ? items
            .map(
              (i) =>
                `<article class="card reveal"><span class="card-icon">${esc(i.icon || "◆")}</span><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p></article>`,
            )
            .join("")
        : `<article class="card reveal"><h3>Service</h3><p>Professional service tailored to your needs.</p></article>`;
      return block(`${sectionHeader(c.title || "Services", c.subtitle, c.eyebrow || "What we do")}<div class="grid">${lis}</div>`, { alt });
    }
    case "about_story": {
      const paras =
        c.paragraphs ||
        (c.body ? [c.body] : null) ||
        (c.text ? [c.text] : null) ||
        (c.story ? [c.story] : ["Our story."]);
      const img = c.image || photo(siteKeyword + " about", 900, 700);
      return block(
        `<div class="split">
          <div class="split-text">
            ${sectionHeader(c.title || "About", null, c.eyebrow || "Our story")}
            ${paras.map((p) => `<p>${esc(p)}</p>`).join("")}
          </div>
          <div class="split-media reveal"><img src="${esc(img)}" alt="${esc(c.title || "About")}" loading="lazy"/></div>
        </div>`,
        { alt },
      );
    }
    case "team": {
      const members = c.members || [];
      const cards = members
        .map(
          (m) =>
            `<article class="card team-card reveal"><div class="avatar">${esc((m.name || "?").charAt(0))}</div><h3>${esc(m.name)}</h3><p class="role">${esc(m.role)}</p>${m.bio ? `<p class="muted">${esc(m.bio)}</p>` : ""}</article>`,
        )
        .join("");
      return block(`${sectionHeader(c.title || "Team", c.subtitle, c.eyebrow || "The people")}<div class="grid">${cards || `<article class="card reveal"><h3>Team member</h3></article>`}</div>`, { alt });
    }
    case "contact_form":
      return block(
        `${sectionHeader(c.title || "Contact", c.subtitle || c.subtitle, c.eyebrow || "Get in touch")}
        <form class="contact-form">
          <div class="field-row"><input placeholder="Name" aria-label="Name"/><input placeholder="Email" type="email" aria-label="Email"/></div>
          <textarea placeholder="Tell us about your project" rows="4" aria-label="Message"></textarea>
          <button type="button">${esc(c.submit_label || "Send message")}</button>
        </form>`,
        { id: "contact", alt },
      );
    case "cta":
      return block(
        `<div class="cta-inner reveal">
          <h2>${esc(c.headline || c.title || "Ready to get started?")}</h2>
          <p>${esc(c.subheadline || c.subtitle || "")}</p>
          <a class="btn" href="${esc(c.button_url || c.cta_url || ctaTarget)}">${esc(c.button_text || c.cta_text || c.cta || "Contact us")}</a>
        </div>`,
        { alt, extra: "cta-block" },
      );
    case "faq": {
      const items = c.items || [];
      const rows = items
        .map(
          (i) =>
            `<details class="faq-item reveal"><summary>${esc(i.question || i.q)}</summary><p>${esc(i.answer || i.a)}</p></details>`,
        )
        .join("");
      return block(`${sectionHeader(c.title || "FAQ", c.subtitle, c.eyebrow || "Questions")}<div class="faq-list">${rows || "<p class='muted'>FAQ coming soon.</p>"}</div>`, { alt });
    }
    case "pricing": {
      const plans = c.plans || c.items || [];
      const cards = plans
        .map(
          (p) =>
            `<article class="card pricing-card reveal ${p.featured ? "featured" : ""}">${p.featured ? `<span class="badge">Popular</span>` : ""}<h3>${esc(p.name || p.title)}</h3><p class="price">${esc(p.price)}</p>${p.description ? `<p class="muted">${esc(p.description)}</p>` : ""}<ul>${(p.features || []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul><a class="btn btn-outline" href="${ctaTarget}">${esc(p.cta || "Choose")}</a></article>`,
        )
        .join("");
      return block(`${sectionHeader(c.title || "Pricing", c.subtitle, c.eyebrow || "Plans")}<div class="grid pricing-grid">${cards}</div>`, { alt });
    }
    case "gallery": {
      const images = c.images || [];
      const cells = images.length
        ? images.map(
            (img) =>
              `<figure class="gallery-item reveal"><img src="${esc(img.url || photo(img.alt || siteKeyword))}" alt="${esc(img.alt || "")}" loading="lazy"/>${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ""}</figure>`,
          )
        : [0, 1, 2, 3, 4, 5].map(
            (i) =>
              `<figure class="gallery-item reveal"><img src="${photo(siteKeyword + " " + i, 700, 500)}" alt="Gallery" loading="lazy"/></figure>`,
          );
      return block(`${sectionHeader(c.title || "Gallery", c.subtitle, c.eyebrow || "Our work")}<div class="gallery-grid">${cells.join("")}</div>`, { alt });
    }
    case "testimonials": {
      const items = c.items || [];
      const quotes = items
        .map(
          (t) =>
            `<blockquote class="quote card reveal"><p>“${esc(t.quote)}”</p><cite>${esc(t.author)}${t.role ? `<span class="muted"> · ${esc(t.role)}</span>` : ""}</cite></blockquote>`,
        )
        .join("");
      return block(`${sectionHeader(c.title || "What clients say", c.subtitle, c.eyebrow || "Testimonials")}<div class="grid">${quotes}</div>`, { alt });
    }
    case "menu": {
      const cats = c.categories || [];
      const inner = cats
        .map(
          (cat) =>
            `<div class="menu-cat"><h3>${esc(cat.name)}</h3><ul class="menu-list">${(cat.items || [])
              .map(
                (item) =>
                  `<li><div class="menu-row"><span class="menu-name">${esc(item.name)}</span><span class="menu-dots"></span><span class="menu-price">${esc(item.price)}</span></div>${item.description ? `<p class="muted">${esc(item.description)}</p>` : ""}</li>`,
              )
              .join("")}</ul></div>`,
        )
        .join("");
      return block(`${sectionHeader(c.title || "Menu", c.subtitle, c.eyebrow || "Taste")}<div class="menu-wrap">${inner}</div>`, { alt });
    }
    case "embed":
      return block(`${sectionHeader(c.title || "Embed", c.subtitle)}${renderIframe(c.url, c.title)}`, { alt });
    case "video":
      return block(`${sectionHeader(c.title || "Video", c.subtitle, c.eyebrow || "Watch")}${renderIframe(c.url || c.embed_url, c.title || "Video")}`, { alt });
    case "blog_list": {
      const posts = c.posts || [];
      return block(
        `${sectionHeader(c.title || "Latest", c.subtitle, c.eyebrow || "Blog")}<div class="grid">${posts
          .map(
            (p) =>
              `<article class="card reveal"><h3>${esc(p.title)}</h3><p class="muted">${esc(p.excerpt)}</p></article>`,
          )
          .join("")}</div>`,
        { alt },
      );
    }
    case "stats": {
      const items = c.items || [];
      const cells = items
        .map(
          (s) =>
            `<div class="stat reveal"><span class="stat-value">${esc(s.value)}</span><span class="stat-label">${esc(s.label)}</span></div>`,
        )
        .join("");
      return block(`<div class="stats-grid">${cells || "<div class='stat reveal'><span class='stat-value'>10+</span><span class='stat-label'>Years</span></div>"}</div>`, { alt, extra: "stats-block" });
    }
    case "features": {
      const items = c.items || [];
      const cells = items
        .map(
          (f) =>
            `<article class="card feature reveal"><span class="card-icon">${esc(f.icon || "✦")}</span><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></article>`,
        )
        .join("");
      return block(`${sectionHeader(c.title || "Features", c.subtitle, c.eyebrow || "Highlights")}<div class="grid">${cells}</div>`, { alt });
    }
    case "process": {
      const steps = c.steps || c.items || [];
      const cells = steps
        .map(
          (s, i) =>
            `<div class="process-step reveal"><span class="step-num">${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p></div>`,
        )
        .join("");
      return block(`${sectionHeader(c.title || "How it works", c.subtitle, c.eyebrow || "Process")}<div class="process-grid">${cells}</div>`, { alt });
    }
    case "map":
      return block(`${sectionHeader(c.title || "Location", c.subtitle, c.eyebrow || "Find us")}${renderIframe(c.embed_url || c.url, "Map")}<p class="muted map-addr">${esc(c.address || data.contact?.address || "")}</p>`, { alt });
    case "hours": {
      const rows = (c.schedule || c.items || []).map(
        (h) => `<tr class="reveal"><td>${esc(h.day || h.label)}</td><td>${esc(h.hours || h.value)}</td></tr>`,
      );
      return block(`${sectionHeader(c.title || "Opening hours", c.subtitle, c.eyebrow || "When")}<table class="hours-table"><tbody>${rows.join("")}</tbody></table>`, { alt });
    }
    case "social_links": {
      const links = c.links || c.items || [];
      const anchors = links
        .map(
          (l) =>
            `<a class="social-link reveal" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.platform)}</a>`,
        )
        .join("");
      return block(`${sectionHeader(c.title || "Follow us", c.subtitle, c.eyebrow || "Community")}<div class="social-row">${anchors}</div>`, { alt });
    }
    case "logos": {
      const logos = c.items || [];
      return block(`${sectionHeader(c.title || "Trusted by", c.subtitle)}<div class="logo-strip">${logos.map((l) => `<span class="logo-item reveal">${esc(l.name || l.label)}</span>`).join("")}</div>`, { alt });
    }
    case "booking_embed":
      return block(`${sectionHeader(c.title || "Book a time", c.subtitle, c.eyebrow || "Schedule")}${renderIframe(c.url || c.embed_url, "Booking")}`, { alt });
    case "newsletter":
      return block(
        `<div class="newsletter-inner reveal">${sectionHeader(c.title || "Stay updated", c.description, c.eyebrow || "Newsletter")}<form class="contact-form newsletter-form"><div class="field-row"><input placeholder="Your email" type="email" aria-label="Email"/><button type="button">${esc(c.button_text || "Subscribe")}</button></div></form></div>`,
        { alt, extra: "cta-block" },
      );
    default:
      return block(`${sectionHeader(kind.replace(/_/g, " "))}`, { alt });
  }
}

const heroTint = "#ffffff";
const btnText = dark ? "#0a0a0a" : "#ffffff";

const styles = `
@import url('https://fonts.googleapis.com/css2?family=${FONTS.headingParam}&family=${FONTS.bodyParam}&display=swap');
:root {
  --primary: ${primary};
  --accent: ${accent};
  --bg: ${bg};
  --bg-alt: ${bgAlt};
  --fg: ${fg};
  --muted: ${muted};
  --card: ${cardBg};
  --border: ${border};
  --font-heading: '${FONTS.headingFamily}', Georgia, 'Times New Roman', serif;
  --font-body: '${FONTS.bodyFamily}', system-ui, -apple-system, sans-serif;
  --radius: 16px;
  --radius-sm: 10px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,${dark ? "0.4" : "0.04"});
  --shadow: 0 10px 30px -12px rgba(0,0,0,${dark ? "0.6" : "0.18"});
  --shadow-lg: 0 24px 60px -20px rgba(0,0,0,${dark ? "0.7" : "0.25"});
  --maxw: 1120px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  font-size: 1.0625rem;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
h1, h2, h3 { font-family: var(--font-heading); line-height: 1.12; font-weight: 600; letter-spacing: -0.02em; }
h2 { font-size: clamp(1.75rem, 3.5vw, 2.6rem); }
h3 { font-size: 1.2rem; margin-bottom: 0.4rem; }
p { color: var(--fg); }
a { color: inherit; }
img { max-width: 100%; display: block; }

/* Layout bands */
.block { padding: clamp(3.5rem, 7vw, 6.5rem) clamp(1.25rem, 5vw, 2rem); }
.block-alt { background: var(--bg-alt); }
.wrap { max-width: var(--maxw); margin: 0 auto; }

/* Section header */
.sec-head { max-width: 680px; margin: 0 auto clamp(2rem, 4vw, 3rem); text-align: center; }
.eyebrow {
  display: inline-block; font-family: var(--font-body); font-size: 0.75rem; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 0.9rem;
}
.eyebrow-light { color: color-mix(in srgb, var(--accent) 70%, #fff); }
.sec-sub { color: var(--muted); font-size: 1.075rem; margin-top: 0.85rem; }

/* Nav */
nav.site-nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; gap: 0.5rem 1.5rem;
  padding: 0.9rem clamp(1.25rem, 5vw, 2rem);
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: saturate(180%) blur(14px);
}
nav.site-nav .inner { display: flex; align-items: center; gap: 1.5rem; width: 100%; max-width: var(--maxw); margin: 0 auto; }
nav.site-nav .brand { font-family: var(--font-heading); font-weight: 700; margin-right: auto; font-size: 1.2rem; letter-spacing: -0.03em; }
nav.site-nav a.nav-link { text-decoration: none; font-size: 0.95rem; font-weight: 500; color: var(--muted); transition: color 0.2s; }
nav.site-nav a.nav-link:hover, nav.site-nav a.nav-link.active { color: var(--fg); }
nav.site-nav .nav-cta { background: var(--accent); color: ${btnText}; padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.9rem; }

/* Hero */
.hero {
  position: relative; min-height: clamp(460px, 78vh, 760px);
  display: flex; align-items: center; justify-content: center;
  background: var(--primary) center/cover no-repeat; color: #fff; text-align: center; overflow: hidden;
}
.hero::before { content: ""; position: absolute; inset: 0; background-image: var(--hero-bg); background-size: cover; background-position: center; transform: scale(1.05); }
.hero-overlay {
  position: absolute; inset: 0;
  background:
    radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%),
    linear-gradient(180deg, color-mix(in srgb, var(--primary) 55%, transparent) 0%, color-mix(in srgb, #000 78%, transparent) 100%);
}
.hero-inner { position: relative; z-index: 1; padding: 2rem 1.5rem; max-width: 820px; }
.hero .eyebrow { color: color-mix(in srgb, var(--accent) 78%, #fff); }
.hero h1 { font-size: clamp(2.4rem, 6vw, 4.4rem); margin-bottom: 1rem; color: #fff; text-shadow: 0 2px 30px rgba(0,0,0,0.3); }
.hero .sub { opacity: 0.94; font-size: clamp(1.05rem, 2.2vw, 1.4rem); margin: 0 auto 2rem; max-width: 620px; color: #f0f0f2; }
.hero-cta { display: flex; gap: 0.85rem; justify-content: center; flex-wrap: wrap; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--accent); color: ${btnText};
  padding: 0.95rem 2rem; border-radius: 999px; text-decoration: none;
  font-weight: 600; font-size: 1rem; border: 1px solid transparent;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
  box-shadow: 0 8px 24px -8px color-mix(in srgb, var(--accent) 60%, transparent);
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 14px 34px -10px color-mix(in srgb, var(--accent) 65%, transparent); }
.btn-ghost { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.3); backdrop-filter: blur(6px); box-shadow: none; }
.btn-ghost:hover { background: rgba(255,255,255,0.2); }
.btn-outline { background: transparent; color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); box-shadow: none; }
.btn-outline:hover { background: color-mix(in srgb, var(--accent) 12%, transparent); }

/* Grid + cards */
.grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.card {
  border: 1px solid var(--border); border-radius: var(--radius); padding: 1.75rem;
  background: var(--card); box-shadow: var(--shadow-sm); position: relative;
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}
.card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); }
.card p { color: var(--muted); }
.card-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 3rem; height: 3rem;
  border-radius: 12px; background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent); font-size: 1.35rem; margin-bottom: 1.1rem;
}
.team-card { text-align: center; }
.avatar {
  width: 4.5rem; height: 4.5rem; border-radius: 50%; margin: 0 auto 1rem;
  display: flex; align-items: center; justify-content: center; font-family: var(--font-heading);
  font-size: 1.6rem; font-weight: 700; color: ${btnText};
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 50%, var(--primary)));
}
.team-card .role { color: var(--accent); font-weight: 600; font-size: 0.95rem; margin-bottom: 0.5rem; }

/* Split (about) */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(2rem, 5vw, 4rem); align-items: center; }
.split-text p { color: var(--muted); margin-bottom: 1rem; }
.split-text .sec-head { text-align: left; margin: 0 0 1.5rem; }
.split-media img { border-radius: var(--radius); box-shadow: var(--shadow-lg); width: 100%; aspect-ratio: 4/3; object-fit: cover; }

/* Contact form */
.contact-form { display: flex; flex-direction: column; gap: 1rem; max-width: 560px; margin: 0 auto; }
.field-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.field-row > * { flex: 1; min-width: 180px; }
.contact-form input, .contact-form textarea {
  padding: 0.9rem 1.1rem; border-radius: var(--radius-sm); width: 100%;
  border: 1px solid var(--border); background: var(--card); color: var(--fg); font: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.contact-form input:focus, .contact-form textarea:focus {
  outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}
.contact-form button {
  background: var(--accent); color: ${btnText}; border: none; padding: 0.95rem 1.5rem;
  border-radius: var(--radius-sm); cursor: pointer; font: inherit; font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}
.contact-form button:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.newsletter-form { flex-direction: row; }

/* CTA band */
.cta-block { background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--accent))); }
.cta-inner { text-align: center; max-width: 640px; margin: 0 auto; }
.cta-inner h2 { color: #fff; }
.cta-inner p { color: rgba(255,255,255,0.85); margin: 1rem 0 2rem; }

/* Stats */
.stats-block { background: var(--bg-alt); }
.stats-grid { display: flex; flex-wrap: wrap; gap: 2.5rem 4rem; justify-content: center; }
.stat { text-align: center; }
.stat-value { display: block; font-family: var(--font-heading); font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 700; color: var(--accent); line-height: 1; }
.stat-label { color: var(--muted); font-size: 1rem; margin-top: 0.5rem; display: block; }

/* Process */
.process-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); counter-reset: step; }
.process-step { padding: 1.5rem; border-radius: var(--radius); background: var(--card); border: 1px solid var(--border); position: relative; }
.process-step .step-num {
  display: inline-flex; width: 2.75rem; height: 2.75rem; align-items: center; justify-content: center;
  background: var(--accent); color: ${btnText}; border-radius: 12px; font-family: var(--font-heading);
  font-weight: 700; font-size: 1.2rem; margin-bottom: 1rem;
}
.process-step p { color: var(--muted); }

/* FAQ */
.faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.75rem; }
.faq-item { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1.1rem 1.35rem; background: var(--card); transition: border-color 0.2s; }
.faq-item[open] { border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); }
.faq-item summary { cursor: pointer; font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center; }
.faq-item summary::after { content: "+"; color: var(--accent); font-size: 1.4rem; transition: transform 0.2s; }
.faq-item[open] summary::after { transform: rotate(45deg); }
.faq-item p { color: var(--muted); margin-top: 0.75rem; }

/* Pricing */
.pricing-grid { align-items: stretch; }
.pricing-card { display: flex; flex-direction: column; text-align: center; }
.pricing-card.featured { border-color: var(--accent); box-shadow: var(--shadow-lg); }
.pricing-card .badge { position: absolute; top: -0.75rem; left: 50%; transform: translateX(-50%); background: var(--accent); color: ${btnText}; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.3rem 0.9rem; border-radius: 999px; }
.price { font-family: var(--font-heading); font-size: 2.4rem; font-weight: 700; color: var(--fg); margin: 0.75rem 0; }
.pricing-card ul { list-style: none; text-align: left; margin: 1rem 0 1.5rem; display: flex; flex-direction: column; gap: 0.6rem; flex: 1; }
.pricing-card li { color: var(--muted); padding-left: 1.5rem; position: relative; }
.pricing-card li::before { content: "✓"; position: absolute; left: 0; color: var(--accent); font-weight: 700; }

/* Gallery */
.gallery-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.gallery-item { overflow: hidden; border-radius: var(--radius); box-shadow: var(--shadow-sm); }
.gallery-item img { width: 100%; aspect-ratio: 4/3; object-fit: cover; transition: transform 0.5s ease; }
.gallery-item:hover img { transform: scale(1.06); }
.gallery-item figcaption { font-size: 0.9rem; color: var(--muted); padding: 0.6rem 0.25rem; }

/* Testimonials */
.quote { font-size: 1.05rem; }
.quote p { color: var(--fg); font-style: italic; margin-bottom: 1rem; }
.quote cite { font-style: normal; font-weight: 600; }

/* Menu */
.menu-wrap { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
.menu-cat h3 { color: var(--accent); border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem; }
.menu-list { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
.menu-row { display: flex; align-items: baseline; gap: 0.75rem; }
.menu-name { font-weight: 600; }
.menu-dots { flex: 1; border-bottom: 1px dotted var(--border); }
.menu-price { color: var(--accent); font-weight: 700; }
.menu-list .muted { font-size: 0.9rem; margin-top: 0.25rem; }

/* Misc */
.embed-wrap { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius); box-shadow: var(--shadow); max-width: 900px; margin: 0 auto; }
.embed-wrap iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.map-addr { text-align: center; margin-top: 1rem; }
.hours-table { width: 100%; max-width: 460px; margin: 0 auto; border-collapse: collapse; }
.hours-table td { padding: 0.85rem 0.5rem; border-bottom: 1px solid var(--border); }
.hours-table td:last-child { text-align: right; color: var(--accent); font-weight: 600; }
.social-row { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; }
.social-link { padding: 0.6rem 1.25rem; border-radius: 999px; border: 1px solid var(--border); text-decoration: none; color: var(--fg); font-size: 0.95rem; font-weight: 500; transition: background 0.2s, border-color 0.2s; }
.social-link:hover { background: color-mix(in srgb, var(--accent) 15%, transparent); border-color: var(--accent); }
.logo-strip { display: flex; flex-wrap: wrap; gap: 2.5rem; justify-content: center; align-items: center; opacity: 0.65; }
.logo-item { font-family: var(--font-heading); font-size: 1.35rem; font-weight: 700; }
.muted { color: var(--muted); }

footer {
  text-align: center; padding: 3rem 1.5rem; color: var(--muted); font-size: 0.95rem;
  border-top: 1px solid var(--border); background: var(--bg-alt);
}
footer .foot-brand { font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: var(--fg); margin-bottom: 0.5rem; }

/* Reveal animation */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); }
.reveal.visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }

/* Mobile nav */
.nav-toggle { display: none; }
.nav-toggle-label { display: none; }
@media (max-width: 768px) {
  .split { grid-template-columns: 1fr; }
  .split-media { order: -1; }
  nav.site-nav .inner { flex-wrap: wrap; }
  .nav-toggle-label { display: block; cursor: pointer; padding: 0.5rem; font-size: 1.3rem; margin-left: auto; }
  nav.site-nav .nav-links { display: none; width: 100%; flex-direction: column; gap: 0.75rem; padding-top: 0.75rem; }
  .nav-toggle:checked ~ .nav-links { display: flex; }
  .newsletter-form { flex-direction: column; }
}
`;

const scrollScript = `
(function(){
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(function(e){e.classList.add('visible');}); return; }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
  els.forEach(function(el){ obs.observe(el); });
})();
`;

function buildNav(currentSlug) {
  const brand = `<a href="index.html" class="brand">${esc(data.site_name)}</a>`;
  const links = pages
    .filter((p) => p.slug !== "contact")
    .map((p) => {
      const href = pageFile(p.slug);
      const active = p.slug === currentSlug ? " active" : "";
      return `<a href="${href}" class="nav-link${active}">${esc(p.title)}</a>`;
    })
    .join("");
  const cta = `<a href="${contactLink}" class="nav-link nav-cta">Contact</a>`;
  return `<nav class="site-nav"><div class="inner">${brand}<input type="checkbox" id="nav-toggle" class="nav-toggle" hidden/><label for="nav-toggle" class="nav-toggle-label">☰</label><div class="nav-links">${links}${cta}</div></div></nav>`;
}

function faviconDataUrl(name) {
  const letter = esc(String(name || "G").charAt(0).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${primary}"/><text x="16" y="22" text-anchor="middle" fill="${accent}" font-size="18" font-family="sans-serif" font-weight="700">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildPageHtml(page) {
  // Alternate band backgrounds on content sections (hero stays full-bleed).
  let altIndex = 0;
  const sectionsHtml = (page.sections || [])
    .map((s) => {
      if (s.kind === "hero") return renderSection(s, page.slug, false);
      const html = renderSection(s, page.slug, altIndex % 2 === 1);
      altIndex += 1;
      return html;
    })
    .join("\n");

  const contact = data.contact || {};
  const footParts = [contact.email, contact.phone, contact.address].filter(Boolean).map(esc).join(" · ");
  const year = new Date().getFullYear();
  const desc = esc(data.tagline || data.site_name);
  const title = esc(page.title) + " · " + esc(data.site_name);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <meta name="description" content="${desc}"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:type" content="website"/>
  <meta name="theme-color" content="${primary}"/>
  <link rel="icon" href="${faviconDataUrl(data.site_name)}"/>
  <style>${styles}</style>
</head>
<body>
  ${buildNav(page.slug)}
  <main>${sectionsHtml}</main>
  <footer>
    <div class="foot-brand">${esc(data.site_name)}</div>
    ${footParts ? `<p>${footParts}</p>` : ""}
    <p class="muted">© ${year} ${esc(data.site_name)}. All rights reserved.</p>
  </footer>
  <script>${scrollScript}</script>
</body>
</html>`;
}

const outDir = join(__dirname, "dist");
mkdirSync(outDir, { recursive: true });

for (const page of pages) {
  writeFileSync(join(outDir, pageFile(page.slug)), buildPageHtml(page), "utf8");
}

console.log(`Built ${data.site_name} (${template}) — ${pages.length} page(s)`);
