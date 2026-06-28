import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(__dirname, "data", "site.json"), "utf8");
const data = JSON.parse(raw.replace(/^\uFEFF/, ""));

const primary = data.theme?.primary || "#003366";
const accent = data.theme?.accent || "#c8a86a";
const dark = Boolean(data.theme?.dark);
const bg = dark ? "#0a0a0a" : "#ffffff";
const fg = dark ? "#f4f4f5" : "#111111";
const muted = dark ? "#a1a1aa" : "#52525b";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSection(section) {
  const kind = section.kind;
  const c = section.content || {};

  switch (kind) {
    case "hero":
      return `<section class="hero"><h1>${esc(c.headline || data.site_name)}</h1><p class="sub">${esc(c.subheadline || data.tagline || "")}</p>${c.cta ? `<a class="btn" href="#contact">${esc(c.cta)}</a>` : ""}</section>`;
    case "services": {
      const items = c.items || [];
      const lis = items.length
        ? items.map((i) => `<li><strong>${esc(i.title)}</strong><p>${esc(i.description)}</p></li>`).join("")
        : "<li>Service one</li><li>Service two</li><li>Service three</li>";
      return `<section><h2>Services</h2><ul class="grid">${lis}</ul></section>`;
    }
    case "about_story": {
      const paras = c.paragraphs || [c.text || "Our story."];
      return `<section><h2>About</h2>${paras.map((p) => `<p>${esc(p)}</p>`).join("")}</section>`;
    }
    case "team": {
      const members = c.members || [];
      const cards = members.map((m) => `<div class="card"><h3>${esc(m.name)}</h3><p>${esc(m.role)}</p></div>`).join("");
      return `<section><h2>Team</h2><div class="grid">${cards || "<div class='card'><h3>Team member</h3></div>"}</div></section>`;
    }
    case "contact_form":
      return `<section id="contact"><h2>Contact</h2><form class="contact-form"><input placeholder="Name" /><input placeholder="Email" type="email" /><textarea placeholder="Message"></textarea><button type="button">${esc(c.submit_label || "Send")}</button></form></section>`;
    case "cta":
      return `<section class="cta"><h2>${esc(c.headline || "Get started")}</h2><a class="btn" href="#contact">${esc(c.button_text || "Contact us")}</a></section>`;
    case "faq": {
      const items = c.items || [];
      const rows = items.map((i) => `<details><summary>${esc(i.question)}</summary><p>${esc(i.answer)}</p></details>`).join("");
      return `<section><h2>FAQ</h2>${rows || "<p>FAQ coming soon.</p>"}</section>`;
    }
    case "pricing": {
      const plans = c.plans || [];
      const cards = plans.map((p) => `<div class="card"><h3>${esc(p.name)}</h3><p class="price">${esc(p.price)}</p><ul>${(p.features || []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>`).join("");
      return `<section><h2>Pricing</h2><div class="grid">${cards}</div></section>`;
    }
    case "gallery": {
      const images = c.images || [];
      return `<section><h2>Gallery</h2><div class="grid">${images.map((img) => `<figure><div class="ph">${esc(img.alt || "Image")}</div><figcaption>${esc(img.caption || "")}</figcaption></figure>`).join("")}</div></section>`;
    }
    case "testimonials": {
      const items = c.items || [];
      return `<section><h2>Testimonials</h2>${items.map((t) => `<blockquote><p>${esc(t.quote)}</p><cite>— ${esc(t.author)}</cite></blockquote>`).join("")}</section>`;
    }
    case "menu": {
      const cats = c.categories || [];
      return `<section><h2>Menu</h2>${cats.map((cat) => `<h3>${esc(cat.name)}</h3><ul>${(cat.items || []).map((item) => `<li><strong>${esc(item.name)}</strong> ${esc(item.price)} — ${esc(item.description)}</li>`).join("")}</ul>`).join("")}</section>`;
    }
    case "embed":
      return `<section><h2>${esc(c.title || "Embed")}</h2><p class="muted">${esc(c.url || "")}</p></section>`;
    case "blog_list": {
      const posts = c.posts || [];
      return `<section><h2>Blog</h2><ul>${posts.map((p) => `<li><strong>${esc(p.title)}</strong> — ${esc(p.excerpt)}</li>`).join("")}</ul></section>`;
    }
    default:
      return `<section><h2>${esc(kind.replace(/_/g, " "))}</h2></section>`;
  }
}

const sectionsHtml = (data.sections || []).map(renderSection).join("\n");
const contact = data.contact || {};
const footer = [contact.email, contact.phone, contact.address].filter(Boolean).map(esc).join(" · ");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(data.site_name)}</title>
  <style>
    :root { --primary: ${primary}; --accent: ${accent}; --bg: ${bg}; --fg: ${fg}; --muted: ${muted}; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; background: var(--bg); color: var(--fg); line-height: 1.6; }
    .hero { background: var(--primary); color: #fff; padding: 4rem 1.5rem; text-align: center; }
    .hero .sub { opacity: 0.9; max-width: 640px; margin: 0.5rem auto 1.5rem; }
    section { padding: 2.5rem 1.5rem; max-width: 960px; margin: 0 auto; }
    h1, h2, h3 { line-height: 1.2; }
    .btn { display: inline-block; background: var(--accent); color: #0a0a0a; padding: 0.75rem 1.5rem; border-radius: 999px; text-decoration: none; font-weight: 600; }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); list-style: none; padding: 0; }
    .card { border: 1px solid #3333; border-radius: 0.75rem; padding: 1rem; }
    .cta { text-align: center; background: color-mix(in srgb, var(--primary) 12%, var(--bg)); }
    .contact-form { display: flex; flex-direction: column; gap: 0.75rem; max-width: 480px; }
    .contact-form input, .contact-form textarea { padding: 0.625rem; border-radius: 0.5rem; border: 1px solid #3333; background: var(--bg); color: var(--fg); }
    .contact-form button { background: var(--primary); color: #fff; border: none; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; }
    .ph { background: #3333; aspect-ratio: 16/10; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: var(--muted); }
    .muted { color: var(--muted); }
    footer { text-align: center; padding: 2rem; color: var(--muted); font-size: 0.875rem; border-top: 1px solid #3333; }
    .price { font-size: 1.25rem; font-weight: 700; color: var(--accent); }
  </style>
</head>
<body>
  ${sectionsHtml}
  <footer>${footer || esc(data.site_name)}</footer>
</body>
</html>`;

const outDir = join(__dirname, "dist");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.html"), html, "utf8");
console.log("Built", data.site_name);
