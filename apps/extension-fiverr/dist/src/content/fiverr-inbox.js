/**
 * Fiverr inbox — read messages (API + DOM), auto-open new threads.
 */
(function gigsterFiverr() {
  if (window.__gigsterFiverr) return;
  window.__gigsterFiverr = true;

  const API = "https://www.fiverr.com/inbox";
  const SEEN_KEY = "gigster_fiverr_seen";
  const FETCH_HEADERS = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function contactKey(c) {
    return c.username || c.id || "";
  }

  function contactTimestamp(c) {
    const recent = c.recentMessage || c.lastMessage;
    if (recent && typeof recent === "object" && recent.createdAt) {
      return Number(recent.createdAt);
    }
    return Number(c.recentMessageDate || 0);
  }

  function needsReply(c) {
    if (c.unread || c.hasUnread) return true;
    if ((c.unreadMessagesCount ?? c.unreadCount ?? 0) > 0) return true;
    const recent = c.recentMessage || c.lastMessage;
    if (recent && typeof recent === "object") {
      if (recent.isMine === true || recent.fromSelf === true) return false;
      if (recent.isMine === false || recent.fromSelf === false) return true;
    }
    const preview = String(c.recentMessageText || c.snippet || "").trim();
    if (/^(you|me)\s*:/i.test(preview)) return false;
    return Boolean(preview);
  }

  function getSeenState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(SEEN_KEY, (data) => resolve(data[SEEN_KEY] || {}));
    });
  }

  function saveSeenState(state) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [SEEN_KEY]: state }, resolve);
    });
  }

  async function fetchContacts() {
    const res = await fetch(`${API}/contacts`, {
      headers: FETCH_HEADERS,
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Fiverr API ${res.status} — log in to Fiverr first`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.contacts || [];
  }

  function contactNeedsAttention(c) {
    if (c.unread || c.hasUnread) return true;
    if ((c.unreadMessagesCount ?? c.unreadCount ?? 0) > 0) return true;
    return needsReply(c);
  }

  function usernameFromInboxHref(href) {
    const s = String(href || "");
    let m = s.match(/\/inbox\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]);
    m = s.match(/inbox\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function contactAnswered(c) {
    const recent = c.recentMessage || c.lastMessage;
    if (recent && typeof recent === "object") {
      if (recent.isMine === true || recent.fromSelf === true) return true;
    }
    const preview = String(c.recentMessageText || c.snippet || "").trim();
    if (/^(you|me)\s*:/i.test(preview)) return true;
    return false;
  }

  function getInboxSidebarRoot() {
    const candidates = document.querySelectorAll(
      '[class*="contacts-list"], [class*="contact-list"], [class*="conversation-list"], [class*="inbox"] aside, aside'
    );
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      const score = el.querySelectorAll('a[href*="inbox"], li, [role="listitem"]').length;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function matchContactByLabel(label, contacts) {
    const lower = String(label || "").trim().toLowerCase();
    if (!lower) return null;
    for (const c of contacts) {
      const name = String(c.displayName || "").trim().toLowerCase();
      const user = contactKey(c).toLowerCase();
      if (name && (lower === name || lower.startsWith(name) || name.startsWith(lower))) {
        return c;
      }
      if (user && lower.includes(user)) return c;
    }
    return null;
  }

  function rgbLooksLikeUnreadDot(bg) {
    const m = String(bg || "").match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return false;
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    return r > 160 && r > g + 40 && r > b + 40;
  }

  function rowHasUnreadDot(row) {
    if (!row) return false;
    for (const el of row.querySelectorAll("span, div, i, svg, circle")) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) continue;
      if (rect.width > 18 || rect.height > 18) continue;
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor || "";
      const fill = el.getAttribute?.("fill") || "";
      if (rgbLooksLikeUnreadDot(bg)) return true;
      if (/#(ff|f)[0-9a-f]{2,}/i.test(fill)) return true;
      const radius = parseFloat(style.borderRadius) || 0;
      if (
        radius >= Math.min(rect.width, rect.height) / 2 - 1 &&
        bg &&
        bg !== "rgba(0, 0, 0, 0)" &&
        bg !== "transparent" &&
        rect.width <= 14
      ) {
        return true;
      }
    }
    return false;
  }

  function rowTextLooksFresh(row) {
    const t = String(row?.innerText || "");
    return (
      /\bjust now\b/i.test(t) ||
      /\b\d+\s*s\b/i.test(t) ||
      /\b\d+\s*min\b/i.test(t) ||
      /\b\d+\s*m\b/i.test(t)
    );
  }

  function rowLooksUnread(row) {
    if (!row) return false;
    if (rowTextLooksFresh(row)) return true;
    if (rowHasUnreadDot(row)) return true;

    const badge = row.querySelector(
      '[class*="badge"], [class*="Badge"], [class*="unread"], [class*="indicator"], [class*="count"], [class*="notification"], [class*="new"]'
    );
    if (badge) {
      const n = parseInt(String(badge.textContent || "").trim(), 10);
      if (Number.isFinite(n) && n > 0) return true;
      if (badge.textContent?.trim()) return true;
    }
    for (const el of row.querySelectorAll("span, div, p")) {
      const t = String(el.textContent || "").trim();
      if (!/^[1-9]\d{0,2}$/.test(t)) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.width <= 28 && r.height > 0 && r.height <= 28) return true;
    }
    const aria = row.getAttribute("aria-label") || "";
    if (/unread/i.test(aria)) return true;
    const cls = String(row.className || "").toLowerCase();
    if (cls.includes("unread")) return true;
    return false;
  }

  function sidebarRowLabel(row, link) {
    const fromLink = String(link?.textContent || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)[0];
    if (fromLink && fromLink.length < 60) return fromLink;
    const fromRow = String(row?.innerText || "")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !/^(just now|\d+\s*m|\d+\s*min|\d+)$/i.test(s))[0];
    return fromRow || "";
  }

  function getSidebarThreads() {
    const threads = [];
    const seen = new Set();

    function addThread(username, row, link, labelHint) {
      if (!username) return;
      const key = username.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const fresh = rowTextLooksFresh(row);
      const unread = rowLooksUnread(row) || fresh;
      const label = labelHint || sidebarRowLabel(row, link) || username;
      threads.push({ username, unread, fresh, label });
    }

    document.querySelectorAll('a[href*="inbox"]').forEach((link) => {
      const href = link.getAttribute("href") || link.href || "";
      const username = usernameFromInboxHref(href);
      const row =
        link.closest(
          'li, [class*="contact"], [class*="Contact"], [class*="conversation"], [role="listitem"]'
        ) || link.parentElement;
      addThread(username, row, link);
    });

    const root = getInboxSidebarRoot();
    const rowNodes = root
      ? root.querySelectorAll('li, [role="listitem"]')
      : document.querySelectorAll(
          '[class*="contacts"] li, [class*="contact-list"] li, [class*="conversation-list"] li'
        );

    rowNodes.forEach((row) => {
      if (!rowLooksUnread(row) && !rowTextLooksFresh(row)) return;
      const link = row.querySelector('a[href*="inbox"]');
      const username = link
        ? usernameFromInboxHref(link.getAttribute("href") || link.href)
        : "";
      const label = sidebarRowLabel(row, link);
      addThread(username, row, link, label);
    });

    return threads;
  }

  function getUnreadUsernamesFromDom() {
    const unread = new Set();
    for (const t of getSidebarThreads()) {
      if (t.unread || t.fresh) unread.add(t.username.toLowerCase());
    }
    return unread;
  }

  async function openUsername(username) {
    const lower = String(username).toLowerCase();

    const tryClick = async (el) => {
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      el.click();
      await sleep(2000);
      return inboxUsernameFromUrl()?.toLowerCase() === lower;
    };

    for (const a of document.querySelectorAll('a[href*="/inbox/"]')) {
      const u = usernameFromInboxHref(a.getAttribute("href") || a.href).toLowerCase();
      if (u !== lower) continue;
      if (await tryClick(a)) return true;
      const row =
        a.closest(
          'li, [class*="contact"], [class*="Contact"], [class*="conversation"], [role="listitem"], [role="button"]'
        ) || a.parentElement;
      if (row && row !== a && (await tryClick(row))) return true;
    }

    return false;
  }

  function pushResult(job, payload) {
    chrome.runtime
      .sendMessage({ type: "GIGSTER_FIVERR_DONE", job, payload })
      .catch(() => {});
  }

  function dispatchJob(job, fn) {
    Promise.resolve()
      .then(fn)
      .then((payload) => pushResult(job, payload))
      .catch((e) => pushResult(job, { ok: false, error: e.message }));
  }

  function inboxUsernameFromUrl() {
    const m = window.location.pathname.match(/^\/inbox\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function contactNameFromPage() {
    const h = document.querySelector(
      '[class*="header"] h1, [class*="Header"] h1, [class*="partner"] h1, [class*="username"]'
    );
    return (h?.textContent || "").trim() || null;
  }

  function messageIsMine(raw) {
    if (raw.isMine === true || raw.fromSelf === true || raw.mine === true) return true;
    if (raw.isMine === false || raw.fromSelf === false) return false;
    const sender = raw.sender || raw.user || raw.author || {};
    if (sender.isSeller === true || sender.type === "seller") return true;
    if (sender.isSeller === false || sender.type === "buyer") return false;
    const role = String(raw.senderType || raw.role || raw.type || "").toLowerCase();
    if (role.includes("seller") || role === "me" || role === "freelancer") return true;
    if (role.includes("buyer") || role === "client" || role === "customer") return false;
    return false;
  }

  function normalizeApiMessages(list) {
    const out = [];
    for (const raw of list) {
      const text = String(
        raw.body ||
          raw.text ||
          raw.content ||
          raw.message ||
          raw.snippet ||
          raw.messageBody ||
          ""
      ).trim();
      if (!text) continue;
      const isMine = messageIsMine(raw);
      let sentAt = null;
      const ts = raw.createdAt || raw.sentAt || raw.timestamp;
      if (ts) {
        const n = Number(ts);
        sentAt = Number.isFinite(n) && n > 1e12 ? new Date(n).toISOString() : String(ts);
      }
      out.push({
        role: isMine ? "assistant" : "client",
        text,
        sent_at: sentAt,
      });
    }
    return out;
  }

  function findMessageArrays(data, depth = 0) {
    if (!data || depth > 8) return [];
    if (Array.isArray(data)) {
      if (
        data.length > 0 &&
        data[0] &&
        typeof data[0] === "object" &&
        (data[0].body || data[0].text || data[0].content || data[0].messageBody)
      ) {
        const normalized = normalizeApiMessages(data);
        if (normalized.length) return normalized;
      }
      return [];
    }
    if (typeof data !== "object") return [];

    for (const key of ["messages", "conversationMessages", "chatMessages", "items"]) {
      if (Array.isArray(data[key])) {
        const normalized = normalizeApiMessages(data[key]);
        if (normalized.length) return normalized;
      }
    }

    for (const v of Object.values(data)) {
      const found = findMessageArrays(v, depth + 1);
      if (found.length) return found;
    }
    return [];
  }

  function extractMessagesFromJson(data, depth = 0) {
    return findMessageArrays(data, depth);
  }

  function readMessagesFromPageState() {
    try {
      const next = document.getElementById("__NEXT_DATA__");
      if (next?.textContent) {
        const parsed = findMessageArrays(JSON.parse(next.textContent));
        if (parsed.length) return finalizeMessages(parsed);
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  async function fetchThreadMessages(username) {
    const user = username || inboxUsernameFromUrl();
    if (!user) return [];

    const urls = [
      `${API}/contacts/${encodeURIComponent(user)}/messages?limit=100`,
      `${API}/contacts/${encodeURIComponent(user)}/messages`,
      `${API}/chats/${encodeURIComponent(user)}/messages?limit=100`,
      `${API}/conversations/${encodeURIComponent(user)}/messages`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: FETCH_HEADERS,
          credentials: "include",
        });
        if (!res.ok) continue;
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.messages || data.data || data.items || data.results || [];
        const normalized = normalizeApiMessages(list);
        if (normalized.length) return finalizeMessages(normalized);
      } catch {
        /* try next */
      }
    }

    const fromState = readMessagesFromPageState();
    if (fromState.length) return fromState;

    return finalizeMessages(readMessagesFromDom());
  }

  function cleanMessageText(text) {
    return String(text || "")
      .replace(/\bShare feedback\b/gi, "")
      .replace(/\bTranslate to English\b/gi, "")
      .replace(/\bWE HAVE YOUR BACK\b[\s\S]*?Learn more\b/gi, "")
      .replace(/\bhas joined the conversation\b/gi, "")
      .replace(/['']s AI Personal Assistant/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isBoilerplateOnly(text) {
    const t = String(text || "").trim();
    if (!t || t.length < 2) return true;
    if (/^we have your back/i.test(t)) return true;
    if (/^share feedback$/i.test(t)) return true;
    if (/^translate to english$/i.test(t)) return true;
    return false;
  }

  function isBlobMessage(text) {
    const t = String(text || "");
    if (t.length > 2000) return true;
    if (/we have your back/i.test(t) && t.length > 300) return true;
    const dates = t.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi);
    return (dates?.length ?? 0) >= 2;
  }

  function normalizeForDedupe(text) {
    return cleanMessageText(text).toLowerCase().replace(/^a\s+/, "");
  }

  function dedupeMessages(messages) {
    const byKey = new Map();
    for (const m of messages) {
      const text = cleanMessageText(m.text);
      if (!text || isBoilerplateOnly(text) || isBlobMessage(text)) continue;
      const role = m.role === "assistant" ? "assistant" : "client";
      const key = `${role}:${normalizeForDedupe(text)}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { role, text, sent_at: m.sent_at || null });
        continue;
      }
      if (m.sent_at && !prev.sent_at) {
        byKey.set(key, { role, text, sent_at: m.sent_at });
      }
    }

    const out = [...byKey.values()];
    const texts = out.map((m) => m.text);
    return out.filter((m, i) => {
      return !texts.some(
        (other, j) => j !== i && other.includes(m.text) && other.length > m.text.length + 50
      );
    });
  }

  function finalizeMessages(messages) {
    const sorted = dedupeMessages(messages);
    if (!sorted.some((m) => m.sent_at)) return sorted;
    return [...sorted].sort((a, b) => {
      const ta = a.sent_at || "";
      const tb = b.sent_at || "";
      if (ta && tb) return ta.localeCompare(tb);
      if (ta) return -1;
      if (tb) return 1;
      return 0;
    });
  }

  function rowIsMine(row) {
    if (!row) return false;
    const text = row.innerText || "";
    if (/^\s*Me\b/m.test(text)) return true;
    const cls = `${row.className || ""}`.toLowerCase();
    if (
      cls.includes("outgoing") ||
      cls.includes("mine") ||
      cls.includes("self") ||
      cls.includes("is-seller") ||
      cls.includes("from-me")
    ) {
      return true;
    }
    if (cls.includes("incoming") || cls.includes("is-buyer") || cls.includes("from-them")) {
      return false;
    }
    const align = window.getComputedStyle(row).alignSelf;
    if (align === "flex-end") return true;
    if (align === "flex-start") return false;
    const parent = row.parentElement;
    if (parent) {
      const pcls = `${parent.className || ""}`.toLowerCase();
      if (pcls.includes("outgoing") || pcls.includes("mine")) return true;
      if (pcls.includes("incoming")) return false;
    }
    return false;
  }

  function readMessagesFromDom() {
    const roots = [
      document.querySelector('[class*="conversation-content"]'),
      document.querySelector('[class*="messages-list"]'),
      document.querySelector('[class*="MessagesList"]'),
      document.querySelector('[class*="chat-content"]'),
      document.querySelector("main"),
    ].filter(Boolean);

    const root = roots[0] || document.body;
    const rowSelectors = [
      '[data-testid="message"]',
      '[class*="message-row"]',
      '[class*="MessageRow"]',
      '[class*="chat-message"]',
      '[class*="bubble"]',
    ];

    let rows = [];
    for (const sel of rowSelectors) {
      root.querySelectorAll(sel).forEach((el) => rows.push(el));
      if (rows.length >= 2) break;
    }

    if (rows.length < 2) {
      rows = [];
      root.querySelectorAll('[class*="message"]').forEach((el) => {
        const t = (el.innerText || "").trim();
        if (t.length > 3 && t.length < 5000) rows.push(el);
      });
    }

    const out = [];
    for (const row of rows) {
      const text = (row.innerText || row.textContent || "").trim();
      if (!text || text.length < 2) continue;
      if (/type a message/i.test(text)) continue;
      if (/would you like to work hourly/i.test(text)) continue;

      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const body = lines.filter(
        (l) =>
          !/^\d{1,2}:\d{2}\s*(am|pm)?$/i.test(l) &&
          !/^(today|yesterday)$/i.test(l) &&
          l !== "Me"
      );
      const msgText = cleanMessageText(body.join(" "));
      if (msgText.length < 2 || isBoilerplateOnly(msgText) || isBlobMessage(msgText)) continue;
      if (msgText.length > 1500) continue;

      out.push({
        role: rowIsMine(row) ? "assistant" : "client",
        text: msgText,
        sent_at: null,
      });
    }

    const deduped = finalizeMessages(out);
    if (deduped.length) return deduped;

    return finalizeMessages(readMessagesFromFallbackText(root));
  }

  function readMessagesFromFallbackText(root) {
    const blocks = (root.innerText || "")
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter((b) => b.length > 10 && b.length < 4000);

    const out = [];
    for (const block of blocks) {
      if (/type a message/i.test(block)) continue;
      const isMine = /^Me\b/m.test(block);
      const text = cleanMessageText(block.replace(/^Me\s*/m, ""));
      if (text.length < 3 || isBoilerplateOnly(text) || isBlobMessage(text)) continue;
      out.push({ role: isMine ? "assistant" : "client", text, sent_at: null });
    }
    return out;
  }

  async function readThread(username) {
    const u = username || inboxUsernameFromUrl();
    if (!u) return { ok: false, error: "Open a Fiverr conversation first" };

    if (username && inboxUsernameFromUrl() !== username) {
      await openUsername(username);
    }

    await sleep(500);
    const messages = finalizeMessages(await fetchThreadMessages(u));
    const clientName = contactNameFromPage() || u;

    if (!messages.length) {
      return {
        ok: false,
        error: "Could not read messages — refresh Fiverr tab and try again",
        username: u,
        messages: [],
      };
    }

    return {
      ok: true,
      username: u,
      client_name: clientName,
      messages,
      message_count: messages.length,
    };
  }

  function contactLastMessageFromClient(c) {
    const recent = c.recentMessage || c.lastMessage;
    if (recent && typeof recent === "object") {
      if (recent.isMine === true || recent.fromSelf === true) return false;
      if (recent.isMine === false || recent.fromSelf === false) return true;
    }
    const preview = String(c.recentMessageText || c.snippet || "").trim();
    if (/^(you|me)\s*:/i.test(preview)) return false;
    return Boolean(preview);
  }

  async function listUnansweredThreads() {
    const contacts = await fetchContacts();
    const contactByKey = new Map();
    for (const c of contacts) {
      const k = contactKey(c).toLowerCase();
      if (k) contactByKey.set(k, c);
    }

    const threads = [];
    const seen = new Set();

    function pushThread(username, displayName, priority) {
      if (!username) return;
      const key = username.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      threads.push({
        username,
        displayName: displayName || username,
        priority,
      });
    }

    const root = getInboxSidebarRoot();
    const rowNodes = root
      ? root.querySelectorAll("li, [role='listitem']")
      : document.querySelectorAll('[class*="contacts"] li, [role="listitem"]');

    for (const row of rowNodes) {
      if (!rowLooksUnread(row) && !rowTextLooksFresh(row)) continue;
      const link = row.querySelector('a[href*="inbox"]');
      let username = link
        ? usernameFromInboxHref(link.getAttribute("href") || link.href)
        : "";
      const label = sidebarRowLabel(row, link);
      if (!username && label) {
        const c = matchContactByLabel(label, contacts);
        if (c) username = contactKey(c);
      }
      if (!username) continue;
      const c = contactByKey.get(username.toLowerCase());
      if (c && contactAnswered(c)) continue;
      pushThread(
        username,
        label || c?.displayName,
        4_000_000 + (c ? contactTimestamp(c) : Date.now())
      );
    }

    const unreadDom = getUnreadUsernamesFromDom();
    for (const c of contacts) {
      const username = contactKey(c);
      if (!username) continue;
      if (contactAnswered(c)) continue;
      const key = username.toLowerCase();
      const unread = unreadDom.has(key);
      const apiUnread = c.unread || c.hasUnread || (c.unreadMessagesCount ?? 0) > 0;
      if (!contactNeedsAttention(c) && !unread && !apiUnread) continue;
      pushThread(
        username,
        c.displayName || username,
        (unread || apiUnread ? 2_000_000 : 1_000_000) + contactTimestamp(c)
      );
    }

    if (!threads.length) {
      const sorted = [...contacts].sort((a, b) => contactTimestamp(b) - contactTimestamp(a));
      for (const c of sorted.slice(0, 10)) {
        const username = contactKey(c);
        if (!username || contactAnswered(c)) continue;
        const msgs = await fetchThreadMessages(username);
        if (!msgs.length) continue;
        if (msgs[msgs.length - 1]?.role !== "client") continue;
        pushThread(username, c.displayName || username, 500_000 + contactTimestamp(c));
      }
    }

    threads.sort((a, b) => b.priority - a.priority);
    return { ok: true, threads, count: threads.length };
  }

  async function checkUserReplied(username, baseline) {
    const base = baseline || {};
    const onChat =
      inboxUsernameFromUrl()?.toLowerCase() === String(username).toLowerCase();

    if (onChat) {
      const domMsgs = finalizeMessages(readMessagesFromDom());
      if (domMsgs.length) {
        const last = domMsgs[domMsgs.length - 1];
        const domAssistants = domMsgs.filter((m) => m.role === "assistant");
        if (last?.role === "assistant" && base.lastWasClient) {
          return { ok: true, replied: true };
        }
        if (domAssistants.length > (base.assistantCount ?? 0)) {
          return { ok: true, replied: true };
        }
        if (domMsgs.length > (base.messageCount ?? 0) && last?.role === "assistant") {
          return { ok: true, replied: true };
        }
      }
    }

    const read = await readThread(username);
    if (!read.ok) return { ok: false, error: read.error };

    const msgs = read.messages || [];
    if (!msgs.length) return { ok: true, replied: false };

    const assistants = msgs.filter((m) => m.role === "assistant");
    const last = msgs[msgs.length - 1];

    if (last?.role === "assistant" && base.lastWasClient) {
      return { ok: true, replied: true };
    }

    if (assistants.length > (base.assistantCount ?? 0)) {
      return { ok: true, replied: true };
    }

    if (msgs.length > (base.messageCount ?? 0) && last?.role === "assistant") {
      return { ok: true, replied: true };
    }

    const lastAssistant = assistants[assistants.length - 1];
    if (
      base.lastWasClient &&
      lastAssistant?.text &&
      lastAssistant.text.trim() !== (base.lastAssistantText || "").trim()
    ) {
      return { ok: true, replied: true };
    }

    return { ok: true, replied: false };
  }

  let replyWatchTimer = null;
  let replyWatchMeta = null;

  function stopReplyWatch() {
    if (replyWatchTimer) clearInterval(replyWatchTimer);
    replyWatchTimer = null;
    replyWatchMeta = null;
  }

  async function tickReplyWatch() {
    if (!replyWatchMeta) return;
    const { username, baseline } = replyWatchMeta;
    const result = await checkUserReplied(username, baseline);
    if (result?.replied) {
      stopReplyWatch();
      chrome.runtime
        .sendMessage({ type: "GIGSTER_USER_REPLIED", username })
        .catch(() => {});
    }
  }

  function pickNextNavigateTarget(excludeUsername, contacts) {
    const current = String(excludeUsername || inboxUsernameFromUrl() || "").toLowerCase();
    const unreadDom = getUnreadUsernamesFromDom();
    const sidebar = getSidebarThreads();

    for (const row of sidebar) {
      const key = row.username.toLowerCase();
      if (!key || key === current) continue;
      if (row.unread || unreadDom.has(key)) {
        return {
          username: row.username,
          displayName: row.label || row.username,
        };
      }
    }

    const candidates = (contacts || [])
      .filter((c) => {
        const key = contactKey(c).toLowerCase();
        if (!key || key === current) return false;
        if (unreadDom.has(key)) return true;
        return contactNeedsAttention(c);
      })
      .sort((a, b) => {
        const keyA = contactKey(a).toLowerCase();
        const keyB = contactKey(b).toLowerCase();
        const rank = (c, key) =>
          (unreadDom.has(key) ? 2_000_000 : 0) +
          (c.unread || c.hasUnread || (c.unreadMessagesCount ?? 0) > 0 ? 1_000_000 : 0) +
          contactTimestamp(c);
        return rank(b, keyB) - rank(a, keyA);
      });

    if (!candidates.length) return null;

    const best = candidates[0];
    const username = contactKey(best);
    if (!username) return null;
    return {
      username,
      displayName: best.displayName || username,
    };
  }

  function findComposerRoot() {
    return (
      document.querySelector('[class*="conversation"] footer') ||
      document.querySelector('[class*="chat"] footer') ||
      document.querySelector('[class*="message-composer"]') ||
      document.querySelector("main")
    );
  }

  function findComposer() {
    const root = findComposerRoot() || document.body;
    const selectors = [
      '[data-testid="message-input"]',
      '[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="type" i]',
      "textarea",
    ];
    for (const sel of selectors) {
      for (const el of root.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 80 || r.height < 16) continue;
        if (el.closest('[class*="sidebar"]')) continue;
        return el;
      }
    }
    const editables = [...root.querySelectorAll('[contenteditable="true"]')];
    return editables.find((el) => el.getBoundingClientRect().width > 100) || null;
  }

  function findSendButton() {
    const root = findComposerRoot() || document.body;
    const candidates = [
      ...root.querySelectorAll('button[data-testid="send-button"]'),
      ...root.querySelectorAll('button[aria-label*="Send" i]'),
      ...document.querySelectorAll("button"),
    ];
    for (const btn of candidates) {
      const label = `${btn.textContent || ""} ${btn.getAttribute("aria-label") || ""}`.trim();
      if (!/send/i.test(label)) continue;
      if (btn.disabled) continue;
      const r = btn.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      return btn;
    }
    return null;
  }

  async function typeIntoComposer(el, text) {
    el.focus();
    await sleep(200);
    const value = String(text || "").trim();
    if (!value) return;

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const proto =
        el.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(el, value);
      else el.value = value;
      el.dispatchEvent(
        new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" })
      );
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      el.textContent = "";
      el.dispatchEvent(
        new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" })
      );
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, value);
      } catch {
        el.textContent = value;
      }
      el.dispatchEvent(
        new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" })
      );
    }
    await sleep(250);
  }

  async function sendReply(text) {
    const body = String(text || "").trim();
    if (!body) return { ok: false, error: "Empty draft" };

    await sleep(500);
    const composer = findComposer();
    if (!composer) {
      return { ok: false, error: "Message box not found — refresh the Fiverr chat" };
    }

    await typeIntoComposer(composer, body);
    await sleep(500);

    const sendBtn = findSendButton();
    if (sendBtn) {
      sendBtn.click();
    } else {
      composer.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
          cancelable: true,
        })
      );
    }

    await sleep(2000);

    const msgs = finalizeMessages(await fetchThreadMessages(inboxUsernameFromUrl()));
    const last = msgs[msgs.length - 1];
    const normBody = normalizeForDedupe(body);
    const normLast = last?.text ? normalizeForDedupe(last.text) : "";

    if (
      last?.role === "assistant" &&
      (normLast === normBody || normLast.includes(normBody.slice(0, 40)))
    ) {
      return { ok: true, sent: true, message_count: msgs.length };
    }

    if (sendBtn) {
      sendBtn.click();
      await sleep(1500);
      const retryMsgs = finalizeMessages(await fetchThreadMessages(inboxUsernameFromUrl()));
      const retryLast = retryMsgs[retryMsgs.length - 1];
      if (retryLast?.role === "assistant") {
        return { ok: true, sent: true, message_count: retryMsgs.length };
      }
    }

    return {
      ok: false,
      error: "Could not confirm send — check the Fiverr tab",
      lastRole: last?.role,
    };
  }

  async function findNextReplyThread(excludeUsername) {
    const contacts = await fetchContacts();
    const target = pickNextNavigateTarget(excludeUsername, contacts);

    if (!target) {
      return {
        ok: true,
        found: false,
        message: "No more chats need a reply — stay on this one",
      };
    }

    return {
      ok: true,
      found: false,
      navigateTo: target.username,
      displayName: target.displayName,
      message: `Opening ${target.displayName}…`,
    };
  }

  async function openNewMessages() {
    const contacts = await fetchContacts();
    const seen = await getSeenState();
    const nextSeen = { ...seen };

    const toOpen = [];
    for (const c of contacts) {
      const key = contactKey(c);
      if (!key) continue;
      const ts = contactTimestamp(c);
      nextSeen[key] = ts;

      if (!needsReply(c)) continue;

      const prevTs = seen[key];
      const isNew = prevTs === undefined || ts > prevTs;
      const wasUnread = c.unread || c.hasUnread || (c.unreadMessagesCount ?? 0) > 0;

      if (isNew || wasUnread) {
        toOpen.push(c);
      }
    }

    await saveSeenState(nextSeen);

    if (!toOpen.length) {
      return {
        ok: true,
        opened: 0,
        total: contacts.length,
        opened_threads: [],
        message: `Watching — ${contacts.length} chats, no new messages`,
      };
    }

    let opened = 0;
    const names = [];
    const openedThreads = [];

    for (const c of toOpen.slice(0, 3)) {
      const username = contactKey(c);
      if (!username) continue;
      const openedOk = await openUsername(username);
      if (!openedOk) continue;
      opened += 1;
      const displayName = c.displayName || username;
      names.push(displayName);

      const read = await readThread(username);
      if (read.ok && read.messages?.length) {
        openedThreads.push({
          username,
          displayName: read.client_name || displayName,
          messages: read.messages,
        });
      }
      await sleep(600);
    }

    return {
      ok: true,
      opened,
      total: contacts.length,
      pending: toOpen.length,
      names,
      opened_threads: openedThreads,
      message:
        opened > 0
          ? `Opened ${opened} new — generating drafts…`
          : "Could not open conversations",
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GIGSTER_PING") {
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "OPEN_FIVERR_NEW") {
      dispatchJob("open_new", openNewMessages);
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "READ_MESSAGES") {
      dispatchJob("read_messages", () => readThread(msg.username));
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "NEXT_REPLY_THREAD") {
      dispatchJob("next_reply", () => findNextReplyThread(msg.excludeUsername));
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "LIST_UNANSWERED") {
      dispatchJob("list_unanswered", listUnansweredThreads);
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "CHECK_USER_REPLIED") {
      dispatchJob("check_replied", () =>
        checkUserReplied(msg.username, msg.baseline)
      );
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "SEND_REPLY") {
      if (msg.mode !== "auto") {
        dispatchJob("send_reply", async () => ({
          ok: false,
          error: "Manual mode — copy the draft and send on Fiverr yourself",
        }));
        sendResponse({ ok: true, started: true });
        return false;
      }
      dispatchJob("send_reply", async () => {
        if (msg.username && inboxUsernameFromUrl() !== msg.username) {
          await openUsername(msg.username);
          await sleep(1200);
        }
        return sendReply(msg.text);
      });
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "START_REPLY_WATCH") {
      stopReplyWatch();
      replyWatchMeta = { username: msg.username, baseline: msg.baseline };
      replyWatchTimer = setInterval(() => {
        tickReplyWatch().catch(() => {});
      }, 2000);
      tickReplyWatch().catch(() => {});
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "STOP_REPLY_WATCH") {
      stopReplyWatch();
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
})();
