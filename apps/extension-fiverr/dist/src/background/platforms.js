/** Marketplace adapters — URL patterns, inbox URLs, content script bundles. */

export const PLATFORMS = {
  fiverr: {
    id: "fiverr",
    label: "Fiverr",
    urlPatterns: ["*://www.fiverr.com/*", "*://fiverr.com/*"],
    inboxUrl: "https://www.fiverr.com/inbox",
    chatUrl: (threadId) =>
      `https://www.fiverr.com/inbox/${encodeURIComponent(threadId)}`,
    bundle: "src/content/fiverr-inbox.js",
    needsAdapterBase: false,
    openInboxHint: "Open fiverr.com/inbox first",
  },
  upwork: {
    id: "upwork",
    label: "Upwork",
    urlPatterns: ["*://www.upwork.com/*"],
    inboxUrl: "https://www.upwork.com/ab/messages/",
    chatUrl: (threadId) =>
      `https://www.upwork.com/ab/messages/rooms/${encodeURIComponent(threadId)}`,
    bundle: "src/content/upwork-inbox.js",
    needsAdapterBase: true,
    openInboxHint: "Open upwork.com/ab/messages first",
  },
  freelancer: {
    id: "freelancer",
    label: "Freelancer",
    urlPatterns: [
      "*://www.freelancer.com/*",
      "*://www.freelancer.com.au/*",
    ],
    inboxUrl: "https://www.freelancer.com/messages/",
    chatUrl: (threadId) =>
      `https://www.freelancer.com/messages/thread/${encodeURIComponent(threadId)}`,
    bundle: "src/content/freelancer-inbox.js",
    needsAdapterBase: true,
    openInboxHint: "Open freelancer.com/messages first",
  },
};

export function getPlatform(id) {
  const key = String(id || "fiverr").toLowerCase();
  return PLATFORMS[key] || PLATFORMS.fiverr;
}

export function matchPlatformFromUrl(url) {
  const u = String(url || "");
  for (const p of Object.values(PLATFORMS)) {
    if (p.id === "fiverr" && /fiverr\.com/i.test(u)) return p;
    if (p.id === "upwork" && /upwork\.com/i.test(u)) return p;
    if (p.id === "freelancer" && /freelancer\.com/i.test(u)) return p;
  }
  return null;
}

export function pickBestTab(tabs, platform) {
  if (!tabs?.length) return null;
  const p = platform || PLATFORMS.fiverr;
  if (p.id === "fiverr") {
    const withChat = tabs.find((t) => /\/inbox\/[^/]+/i.test(t.url || ""));
    if (withChat) return withChat;
    const inbox = tabs.find((t) => /\/inbox/i.test(t.url || ""));
    if (inbox) return inbox;
    return tabs[0];
  }
  if (p.id === "upwork") {
    const room = tabs.find((t) => /\/ab\/messages\/rooms\/[^/]+/i.test(t.url || ""));
    if (room) return room;
    const inbox = tabs.find((t) => /\/ab\/messages/i.test(t.url || ""));
    if (inbox) return inbox;
    return tabs[0];
  }
  if (p.id === "freelancer") {
    const thread = tabs.find((t) => /\/messages\/thread\/\d+/i.test(t.url || ""));
    if (thread) return thread;
    const legacy = tabs.find((t) => /\/messages\/\d+/i.test(t.url || ""));
    if (legacy) return legacy;
    const inbox = tabs.find((t) => /\/messages/i.test(t.url || ""));
    if (inbox) return inbox;
    return tabs[0];
  }
  return tabs[0];
}
