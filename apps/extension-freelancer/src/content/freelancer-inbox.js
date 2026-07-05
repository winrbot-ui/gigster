/**
 * Freelancer.com inbox adapter — read/send messages via DOM.
 */
(function gigsterFreelancer() {
  if (window.__gigsterFreelancer) return;
  window.__gigsterFreelancer = true;

  const A = window.GigsterAdapter;
  if (!A) {
    console.error("Gigster: adapter-base.js must load before freelancer-inbox.js");
    return;
  }

  function threadIdFromUrl() {
    let m = window.location.pathname.match(/\/messages\/thread\/(\d+)/i);
    if (m) return m[1];
    m = window.location.pathname.match(/\/messages\/(\d+)/i);
    if (m) return m[1];
    const q = new URLSearchParams(window.location.search);
    return q.get("threadId") || q.get("thread_id") || q.get("id") || null;
  }

  function threadIdFromHref(href) {
    const s = String(href || "");
    let m = s.match(/\/messages\/thread\/(\d+)/i);
    if (m) return m[1];
    m = s.match(/\/messages\/(\d+)/i);
    return m ? m[1] : "";
  }

  function isInSidebar(el) {
    return Boolean(
      el?.closest?.(
        '[class*="thread-list"], [class*="ThreadList"], [class*="conversation-list"], aside, nav'
      )
    );
  }

  function cleanContactText(text) {
    return String(text || "")
      .replace(/[\u0336\u0338\u0335\u0305\u0306\u0329]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isMetaLine(text) {
    const t = cleanContactText(text);
    if (!t) return true;
    if (/^(chat details|online|offline|active|messages|now|typing)$/i.test(t)) {
      return true;
    }
    if (/^\d{1,2}:\d{2}(\s*(am|pm))?$/i.test(t)) return true;
    if (/^(today|yesterday)$/i.test(t)) return true;
    if (
      /^\d+\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|week|weeks|mo|month|months|y|yr|year|years)$/i.test(
        t
      )
    ) {
      return true;
    }
    return false;
  }

  function isUsernameOnlyLine(text) {
    const t = cleanContactText(text);
    return /^@[A-Za-z0-9_]+$/.test(t);
  }

  function isDisplayNameOnlyLine(text) {
    const t = cleanContactText(text);
    if (!t || isMetaLine(t) || lineSaysYouSent(t) || t.includes("@")) return false;
    return /^[A-Za-z][A-Za-z.'\- ]{0,60}$/.test(t);
  }

  function parseUsernameToken(text) {
    const t = cleanContactText(text);
    if (!t) return null;
    const atMatch = t.match(/^@([A-Za-z0-9_]+)$/);
    if (atMatch) return atMatch[1];
    const embedded = t.match(/@([A-Za-z0-9_]+)/);
    return embedded ? embedded[1] : null;
  }

  function parseContactFromLines(lines) {
    let client_name = null;
    let client_username = null;

    for (const raw of lines) {
      const t = cleanContactText(raw);
      if (!t || lineSaysYouSent(t) || isMetaLine(t)) continue;

      const combined = t.match(/^(.+?)\s+@([A-Za-z0-9_]+)$/);
      if (combined) {
        const name = cleanContactText(combined[1]);
        if (name && !isMetaLine(name)) client_name = client_name || name;
        client_username = client_username || combined[2];
        continue;
      }

      if (isUsernameOnlyLine(t)) {
        client_username = client_username || parseUsernameToken(t);
        continue;
      }

      const embeddedUser = parseUsernameToken(t);
      if (embeddedUser) {
        client_username = client_username || embeddedUser;
        const name = cleanContactText(t.replace(/@[A-Za-z0-9_]+/g, ""));
        if (name && !isMetaLine(name)) client_name = client_name || name;
        continue;
      }

      if (isDisplayNameOnlyLine(t)) {
        client_name = client_name || t;
      }
    }

    return { client_name, client_username };
  }

  function parseContactLine(text) {
    return parseContactFromLines([text]);
  }

  function pickContactFromLines(lines) {
    return parseContactFromLines(lines);
  }

  function mergeContact(...parts) {
    let client_name = null;
    let client_username = null;
    for (const part of parts) {
      if (!part) continue;
      if (part.client_name && !client_name) client_name = part.client_name;
      if (part.client_username && !client_username) client_username = part.client_username;
    }
    return { client_name, client_username };
  }

  function contactInfoFromPage() {
    let client_name = null;
    let client_username = null;

    const header = document.querySelector(
      '[class*="ThreadHeader"], [class*="thread-header"], [class*="chat-header"]'
    );
    const scope = header || document;

    for (const el of scope.querySelectorAll('[class*="display-name"]')) {
      const t = cleanContactText(el.textContent || "");
      if (isDisplayNameOnlyLine(t)) {
        client_name = client_name || t;
        break;
      }
    }

    for (const el of scope.querySelectorAll('[class*="username"]')) {
      const user = parseUsernameToken(el.textContent || "");
      if (user) {
        client_username = client_username || user;
        break;
      }
    }

    if (header) {
      const fromLines = parseContactFromLines(
        (header.innerText || "")
          .split("\n")
          .map((line) => cleanContactText(line))
          .filter(Boolean)
      );
      client_name = client_name || fromLines.client_name;
      client_username = client_username || fromLines.client_username;
    }

    if (!client_name) {
      for (const el of scope.querySelectorAll("h1, h2")) {
        const t = cleanContactText(el.textContent || "");
        if (isDisplayNameOnlyLine(t)) {
          client_name = t;
          break;
        }
      }
    }

    return { client_name, client_username };
  }

  function contactInfoFromSidebar(threadId, row, link) {
    const lines = row && link ? previewLinesFromRow(row, link) : [];
    if (!lines.length) {
      for (const item of iterSidebarThreads()) {
        if (item.threadId !== threadId) continue;
        lines.push(...previewLinesFromRow(item.row, item.link));
        break;
      }
    }

    if (row) {
      for (const el of row.querySelectorAll('[class*="display-name"]')) {
        const t = cleanContactText(el.textContent || "");
        if (isDisplayNameOnlyLine(t)) lines.unshift(t);
      }
      for (const el of row.querySelectorAll('[class*="username"]')) {
        const user = parseUsernameToken(el.textContent || "");
        if (user) lines.push(`@${user}`);
      }
    }

    return parseContactFromLines(lines);
  }

  function resolveContact(threadId, row, link) {
    return mergeContact(
      contactInfoFromPage(),
      contactInfoFromSidebar(threadId, row, link)
    );
  }

  function formatContactLabel(contact, fallback) {
    if (!contact?.client_name && !contact?.client_username) return fallback;
    if (contact.client_name && contact.client_username) {
      return `${contact.client_name} @${contact.client_username}`;
    }
    return contact.client_name || `@${contact.client_username}` || fallback;
  }

  function contactNameFromPage() {
    return contactInfoFromPage().client_name;
  }

  function getMessageRoot() {
    const roots = [
      document.querySelector('[class*="ThreadMessages"]'),
      document.querySelector('[class*="thread-messages"]'),
      document.querySelector('[class*="MessageList"]'),
      document.querySelector('[class*="message-list"]'),
      document.querySelector('[class*="chat-messages"]'),
      document.querySelector("main"),
    ].filter(Boolean);
    return roots[0] || document.body;
  }

  function getSidebarRoot() {
    const candidates = document.querySelectorAll(
      '[class*="thread-list"], [class*="conversation-list"], [class*="messages-list"], aside'
    );
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      const score = el.querySelectorAll('a[href*="/messages/"]').length;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function rowLooksUnread(row) {
    if (!row) return false;
    const cls = String(row.className || "").toLowerCase();
    if (cls.includes("unread")) return true;
    if (row.querySelector('[class*="unread"], [class*="badge"], .badge')) return true;
    return false;
  }

  function findSidebarConversationRow(link) {
    let row = link;
    const root = getSidebarRoot() || document.body;
    for (let i = 0; i < 8 && row; i++) {
      const parent = row.parentElement;
      if (!parent || parent === root || parent === document.body) break;
      const threadLinks = parent.querySelectorAll('a[href*="/messages/"]');
      if (threadLinks.length === 1) {
        row = parent;
        break;
      }
      row = parent;
    }
    return row || link;
  }

  function iterSidebarThreads() {
    const root = getSidebarRoot() || document.body;
    const links = root.querySelectorAll('a[href*="/messages/"]');
    const byId = new Map();

    for (const link of links) {
      const threadId = threadIdFromHref(link.href || link.getAttribute("href"));
      if (!threadId) continue;
      const row = findSidebarConversationRow(link);
      if (!byId.has(threadId)) {
        byId.set(threadId, { threadId, row, link });
      }
    }
    return [...byId.values()];
  }

  function previewLinesFromRow(row, link) {
    const text = (row?.innerText || link?.textContent || "").trim();
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function lineSaysYouSent(line) {
    return /^you\s*:/i.test(String(line || "").trim());
  }

  function rowPreviewLastFromYou(row, link) {
    const full = (row?.innerText || link?.textContent || "").trim();
    if (/\bYou\s*:/i.test(full)) return true;

    const lines = previewLinesFromRow(row, link);
    for (const line of lines) {
      if (lineSaysYouSent(line)) return true;
    }

    const previewEls = row.querySelectorAll(
      '[class*="preview"], [class*="snippet"], [class*="last-message"], [class*="subtitle"], [class*="excerpt"], [class*="secondary"]'
    );
    for (const el of previewEls) {
      if (lineSaysYouSent(el.textContent)) return true;
    }

    return false;
  }

  function getSidebarRowText(threadId) {
    for (const { threadId: id, row, link } of iterSidebarThreads()) {
      if (id === threadId) return (row?.innerText || link.textContent || "").trim();
    }
    return "";
  }

  function sidebarLastFromYou(threadId) {
    for (const { threadId: id, row, link } of iterSidebarThreads()) {
      if (id === threadId) return rowPreviewLastFromYou(row, link);
    }
    return false;
  }

  function threadLabelFromRow(row, link) {
    const threadId = threadIdFromHref(link?.href || link?.getAttribute?.("href"));
    const contact = contactInfoFromSidebar(threadId, row, link);
    if (contact.client_name || contact.client_username) {
      return formatContactLabel(contact, null);
    }
    for (const line of previewLinesFromRow(row, link)) {
      if (lineSaysYouSent(line)) continue;
      if (isMetaLine(line)) continue;
      if (/^\d{1,2}:\d{2}/.test(line)) continue;
      if (line.length > 80) continue;
      return line;
    }
    return null;
  }

  function threadNeedsReply(row, link, threadId) {
    if (rowPreviewLastFromYou(row, link)) return false;

    if (threadIdFromUrl() === threadId) {
      const msgs = readMessagesFromDom();
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant") return false;
      if (last?.role === "client") return true;
      return false;
    }

    // Not the open thread — only queue if sidebar preview is not from you.
    const lines = previewLinesFromRow(row, link);
    const hasClientPreview = lines.some(
      (line) =>
        !lineSaysYouSent(line) &&
        !isMetaLine(line) &&
        line.length > 3 &&
        !/^you\b/i.test(line)
    );
    return hasClientPreview;
  }

  async function verifyNeedsReply(username) {
    const threadId = username || threadIdFromUrl();
    if (!threadId) {
      return { ok: false, needs_reply: false, error: "No thread id" };
    }

    if (sidebarLastFromYou(threadId)) {
      return { ok: true, needs_reply: false, reason: "sidebar_you" };
    }

    const read = await readThread(threadId);
    if (!read.ok) {
      return { ok: false, needs_reply: false, error: read.error };
    }
    if (read.already_replied) {
      return { ok: true, needs_reply: false, reason: "already_replied" };
    }

    const last = (read.messages || [])[read.messages.length - 1];
    if (last?.role === "assistant") {
      return { ok: true, needs_reply: false, reason: "last_assistant" };
    }
    if (last?.role === "client") {
      return { ok: true, needs_reply: true };
    }
    return { ok: true, needs_reply: false, reason: "unknown" };
  }

  function dedupeMessageRows(rows) {
    return rows.filter((row, i) => {
      return !rows.some((other, j) => j !== i && row.contains(other));
    });
  }

  function rowLooksMineFreelancer(row) {
    if (!row) return false;
    if (A.rowLooksMine(row)) return true;

    const cls = `${row.className || ""}`.toLowerCase();
    if (
      cls.includes("self") ||
      cls.includes("outgoing") ||
      cls.includes("sent") ||
      cls.includes("own") ||
      cls.includes("from-me")
    ) {
      return true;
    }
    if (
      cls.includes("incoming") ||
      cls.includes("received") ||
      cls.includes("from-them") ||
      cls.includes("other")
    ) {
      return false;
    }

    let el = row;
    for (let i = 0; i < 8 && el; i++) {
      const style = window.getComputedStyle(el);
      if (style.marginLeft === "auto") return true;
      if (style.alignSelf === "flex-end") return true;
      if (style.justifyContent === "flex-end" && style.display.includes("flex")) {
        return true;
      }
      if (style.marginRight === "auto" && style.marginLeft !== "auto") return false;
      if (style.alignSelf === "flex-start") return false;
      el = el.parentElement;
    }

    const root = getMessageRoot();
    const rootRect = root.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.width < 40) return false;
    const rowCenter = rowRect.left + rowRect.width / 2;
    const rootCenter = rootRect.left + rootRect.width / 2;
    if (rowCenter > rootCenter + 50) return true;
    if (rowCenter < rootCenter - 50) return false;

    return false;
  }

  function readMessagesFromDom() {
    const root = getMessageRoot();
    const selectors = [
      '[class*="ChatMessage"]',
      '[class*="MessageItem"]',
      '[class*="message-item"]',
      '[class*="chat-message"]',
      '[class*="message-bubble"]',
      '[data-testid="message"]',
    ];

    let rows = [];
    for (const sel of selectors) {
      root.querySelectorAll(sel).forEach((el) => {
        if (!isInSidebar(el)) rows.push(el);
      });
      if (rows.length >= 2) break;
    }

    if (rows.length < 2) {
      rows = [];
      root.querySelectorAll('[class*="message"]').forEach((el) => {
        if (isInSidebar(el)) return;
        const t = (el.innerText || "").trim();
        if (t.length > 2 && t.length < 2000) rows.push(el);
      });
    }

    rows = dedupeMessageRows(rows);
    rows.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    const out = [];
    for (const row of rows) {
      const msgText = A.extractTextFromRow(row);
      if (!msgText || msgText.length < 2 || A.isBlobMessage(msgText)) continue;
      if (/^type a message/i.test(msgText)) continue;
      const cls = `${row.className || ""}`.toLowerCase();
      const mine =
        rowLooksMineFreelancer(row) ||
        cls.includes("self") ||
        cls.includes("outgoing") ||
        cls.includes("sent") ||
        row.querySelector('[class*="self"], [class*="outgoing"], [class*="sent"]');
      out.push({
        role: mine ? "assistant" : "client",
        text: msgText,
        sent_at: null,
      });
    }
    return A.finalizeMessages(out);
  }

  async function openThread(threadId) {
    if (!threadId) return false;
    if (threadIdFromUrl() === threadId) return true;
    window.location.href = `https://www.freelancer.com/messages/thread/${encodeURIComponent(threadId)}`;
    await A.sleep(2500);
    return threadIdFromUrl() === threadId;
  }

  async function readThread(username) {
    const threadId = username || threadIdFromUrl();
    if (!threadId) {
      return { ok: false, error: "Open a Freelancer message thread first" };
    }

    if (username && threadIdFromUrl() !== username) {
      await openThread(username);
    }

    await A.sleep(600);

    const contact = resolveContact(threadId);

    if (sidebarLastFromYou(threadId)) {
      return {
        ok: true,
        username: threadId,
        client_name: contact.client_name || threadId,
        client_username: contact.client_username || null,
        messages: readMessagesFromDom(),
        already_replied: true,
        last_from: "assistant",
      };
    }

    const messages = readMessagesFromDom();
    const clientName = contact.client_name || contact.client_username || threadId;

    if (!messages.length) {
      return {
        ok: false,
        error: "Could not read messages — refresh Freelancer and open the thread",
        username: threadId,
        messages: [],
      };
    }

    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      return {
        ok: true,
        username: threadId,
        client_name: clientName,
        client_username: contact.client_username || null,
        messages,
        message_count: messages.length,
        already_replied: true,
        last_from: "assistant",
      };
    }

    return {
      ok: true,
      username: threadId,
      client_name: clientName,
      client_username: contact.client_username || null,
      messages,
      message_count: messages.length,
    };
  }

  async function listUnansweredThreads() {
    const threads = [];

    for (const { threadId, row, link } of iterSidebarThreads()) {
      if (!threadNeedsReply(row, link, threadId)) continue;

      const contact = contactInfoFromSidebar(threadId, row, link);
      const label = formatContactLabel(contact, threadId);
      const priority = rowLooksUnread(row) ? 1_000_000 + Date.now() : Date.now();
      threads.push({
        username: threadId,
        displayName: label,
        client_name: contact.client_name || null,
        client_username: contact.client_username || null,
        priority,
      });
    }

    threads.sort((a, b) => b.priority - a.priority);
    return { ok: true, threads, count: threads.length };
  }

  async function checkUserReplied(username, baseline) {
    const base = baseline || {};

    if (sidebarLastFromYou(username)) {
      return { ok: true, replied: true };
    }

    const read = await readThread(username);
    if (!read.ok) return { ok: false, error: read.error };

    const msgs = read.messages || [];
    const assistants = msgs.filter((m) => m.role === "assistant");
    const last = msgs[msgs.length - 1];

    if (last?.role === "assistant") {
      return { ok: true, replied: true };
    }
    if (assistants.length > (base.assistantCount ?? 0)) {
      return { ok: true, replied: true };
    }
    return { ok: true, replied: false };
  }

  let replyWatchTimer = null;

  function stopReplyWatch() {
    if (replyWatchTimer) clearInterval(replyWatchTimer);
    replyWatchTimer = null;
  }

  async function tickReplyWatch(meta) {
    if (!meta?.username) return;
    const check = await checkUserReplied(meta.username, meta.baseline);
    if (check.replied) {
      stopReplyWatch();
      chrome.runtime
        .sendMessage({ type: "GIGSTER_USER_REPLIED", username: meta.username })
        .catch(() => {});
    }
  }

  async function messageAppearedInThread(body) {
    const snippet = A.normalizeForDedupe(body).slice(0, 60);
    if (!snippet) return false;
    await A.sleep(500);
    const msgs = readMessagesFromDom();
    for (let i = msgs.length - 1; i >= Math.max(0, msgs.length - 4); i--) {
      const m = msgs[i];
      if (m.role !== "assistant") continue;
      const t = A.normalizeForDedupe(m.text);
      if (t.includes(snippet.slice(0, 35)) || snippet.includes(t.slice(0, 35))) {
        return true;
      }
    }
    return false;
  }

  function queryAllDeep(selector, root = document) {
    const out = [];
    const walk = (node) => {
      if (!node) return;
      try {
        out.push(...node.querySelectorAll(selector));
      } catch {
        /* invalid selector in some roots */
      }
      const children = node.querySelectorAll ? node.querySelectorAll("*") : [];
      for (const el of children) {
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(root);
    return out;
  }

  function clickDeep(el) {
    const targets = [];
    let node = el;
    for (let i = 0; i < 5 && node; i++) {
      targets.push(node);
      if (node.shadowRoot) {
        const inner = node.shadowRoot.querySelector(
          'button, [role="button"], a, input[type="submit"]'
        );
        if (inner) targets.push(inner);
      }
      node = node.parentElement;
    }
    return [...new Set(targets)];
  }

  async function clickFreelancerSend(btn) {
    for (const t of clickDeep(btn)) {
      await A.clickSendButton(t);
    }
  }

  function allSendButtonsInFooter() {
    const minY = window.innerHeight * 0.55;
    const found = [];
    for (const el of queryAllDeep(
      "button, [role='button'], a, fl-button, fl-icon-button"
    )) {
      if (isInSidebar(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.top < minY || r.width < 30 || r.height < 24) continue;
      const raw = (el.textContent || "").trim();
      if (!/^send$/i.test(raw) && !/^reply$/i.test(raw)) continue;
      found.push(el.closest("button, [role='button'], fl-button, a") || el);
    }
    return found;
  }

  function deepElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) break;
      el = inner;
    }
    return el;
  }

  function composerEditTarget(composer) {
    if (!composer) return null;
    if (composer.isContentEditable) {
      return composer.querySelector('[contenteditable="true"]') || composer;
    }
    return composer;
  }

  async function pressEnterHard(el) {
    const base = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    };
    const chain = [];
    let node = el;
    for (let i = 0; i < 6 && node; i++) {
      chain.push(node);
      node = node.parentElement;
    }
    if (document.activeElement) chain.push(document.activeElement);
    chain.push(document.body, document);

    for (const target of chain) {
      if (!target?.dispatchEvent) continue;
      target.focus?.();
      for (const type of ["keydown", "keypress", "keyup"]) {
        target.dispatchEvent(new KeyboardEvent(type, base));
      }
    }
  }

  async function tryEnterToSend(composer, body) {
    const target = composerEditTarget(composer);
    if (!target) return false;

    for (let attempt = 0; attempt < 5; attempt++) {
      target.focus();
      composer.focus?.();
      await A.sleep(250);

      await pressEnterHard(target);
      await A.sleep(1400);
      if (await messageAppearedInThread(body)) return true;
      if (!A.composerStillHasDraft(composer, body)) return true;

      await pressCtrlEnter(target);
      await A.sleep(1200);
      if (await messageAppearedInThread(body)) return true;
      if (!A.composerStillHasDraft(composer, body)) return true;

      const form = composer.closest("form");
      if (form) {
        try {
          form.requestSubmit?.();
        } catch {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
        await A.sleep(1200);
        if (await messageAppearedInThread(body)) return true;
        if (!A.composerStillHasDraft(composer, body)) return true;
      }
    }
    return false;
  }

  function findPaperPlaneButton(composer) {
    const cr = composer.getBoundingClientRect();
    let best = null;
    let bestDist = Infinity;

    for (const el of queryAllDeep(
      'button, [role="button"], fl-button, fl-icon-button, [class*="send"], [class*="Send"]'
    )) {
      if (isInSidebar(el)) continue;
      const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`.toLowerCase();
      const r = el.getBoundingClientRect();
      if (r.width < 28 || r.height < 28) continue;

      const near =
        r.left >= cr.right - 30 &&
        r.top >= cr.top - 50 &&
        r.top <= cr.bottom + 50;
      if (!near && !/send|submit|reply/i.test(label)) continue;

      const round = Math.abs(r.width - r.height) <= 18;
      const hasIcon =
        el.querySelector("svg, fl-icon, [class*='icon'], use, i") ||
        el.shadowRoot?.querySelector("svg, fl-icon, use");
      if (!round && !hasIcon && !/send|submit|reply/i.test(label)) continue;

      const dist = Math.hypot(r.left - cr.right, r.top + r.height / 2 - (cr.top + cr.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = el.closest("button, [role='button'], fl-button, fl-icon-button") || el;
      }
    }
    return best;
  }

  function sendButtonByPoint(composer) {
    const cr = composer.getBoundingClientRect();
    const points = [
      [cr.right + 24, cr.bottom - 18],
      [cr.right + 36, cr.bottom - 24],
      [cr.right + 12, cr.top + 16],
      [window.innerWidth - 48, cr.bottom - 20],
    ];
    for (const [x, y] of points) {
      const hit = deepElementFromPoint(x, y);
      const btn = hit?.closest?.(
        'button, [role="button"], fl-button, fl-icon-button, a, [class*="send"], [class*="Send"]'
      );
      if (btn && !isInSidebar(btn)) return btn;
    }
    return null;
  }

  async function tryAllSendClicks(composer, body) {
    const candidates = [
      findPaperPlaneButton(composer),
      sendButtonByPoint(composer),
      findFreelancerSendButton(composer, false),
      findFreelancerSendButton(composer, true),
      ...allSendButtonsInFooter(),
    ].filter(Boolean);

    const seen = new Set();
    for (const btn of candidates) {
      if (seen.has(btn)) continue;
      seen.add(btn);
      await clickFreelancerSend(btn);
      await A.sleep(1800);
      if (await messageAppearedInThread(body)) return true;
      if (!A.composerStillHasDraft(composer, body)) return true;
    }
    return false;
  }

  async function sendReply(text) {
    const body = String(text || "").trim();
    if (!body) return { ok: false, error: "Empty draft" };

    await A.sleep(400);
    const composer = findFreelancerComposer();
    if (!composer) {
      return { ok: false, error: "Message box not found — refresh the Freelancer chat" };
    }

    const beforeCount = readMessagesFromDom().length;
    await typeForFreelancer(composer, body);
    await A.sleep(700);

    // User flow: press Enter to send (Freelancer paper-plane button is icon-only).
    if (await tryEnterToSend(composer, body)) {
      return { ok: true, sent: true };
    }

    if (await tryAllSendClicks(composer, body)) {
      return { ok: true, sent: true };
    }

    if (await tryEnterToSend(composer, body)) {
      return { ok: true, sent: true };
    }

    const afterCount = readMessagesFromDom().length;
    if (afterCount > beforeCount) {
      return { ok: true, sent: true };
    }

    if (!A.composerStillHasDraft(composer, body)) {
      return { ok: true, sent: true };
    }

    return {
      ok: false,
      error: "Could not send — press Enter or Send manually",
    };
  }

  function findFreelancerComposer() {
    for (const el of queryAllDeep(
      '[contenteditable="true"], textarea, input[type="text"]'
    )) {
      if (isInSidebar(el)) continue;
      const ph = `${el.getAttribute("placeholder") || ""} ${el.getAttribute("data-placeholder") || ""}`;
      if (/type a message/i.test(ph)) return el;
      const r = el.getBoundingClientRect();
      if (r.width > 180 && r.height > 24 && r.bottom > window.innerHeight * 0.45) {
        return el;
      }
    }
    return A.findComposer();
  }

  function isSendable(el) {
    if (!el) return false;
    if (el.disabled) return false;
    if (el.getAttribute("aria-disabled") === "true") return false;
    if (el.classList?.contains("disabled")) return false;
    return true;
  }

  async function pressCtrlEnter(el) {
    for (const type of ["keydown", "keypress", "keyup"]) {
      el.dispatchEvent(
        new KeyboardEvent(type, {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
      );
    }
  }

  function findFreelancerSendButton(composer, allowDisabled = false) {
    const cr = composer.getBoundingClientRect();
    const nodes = queryAllDeep(
      'button, [role="button"], fl-button, fl-icon-button, a, div[class*="btn"], [class*="send"], [class*="Send"], [class*="reply"]'
    );

    let iconBest = null;
    let iconDist = Infinity;

    for (const el of nodes) {
      if (isInSidebar(el)) continue;
      const label = `${el.textContent || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`.toLowerCase();
      const r = el.getBoundingClientRect();
      if (r.width < 12 || r.height < 12) continue;
      if (!allowDisabled && !isSendable(el)) continue;

      const rawText = (el.textContent || "").trim();
      if (/^(reply|send)$/i.test(rawText)) {
        return el.closest("button, [role='button'], fl-button, a") || el;
      }
      if (/send|reply|submit/i.test(label)) {
        return el.closest("button, [role='button'], fl-button, a") || el;
      }

      const near =
        r.left >= cr.right - 80 &&
        r.top >= cr.top - 60 &&
        r.top <= cr.bottom + 100;
      if (!near) continue;

      const hasIcon = el.querySelector("svg, fl-icon, [class*='icon'], use, i");
      const dist = Math.hypot(r.left - cr.right, r.top - cr.bottom);
      if ((hasIcon || r.width <= 120) && dist < iconDist) {
        iconDist = dist;
        iconBest = el.closest("button, [role='button'], fl-button, a") || el;
      }
    }

    return iconBest;
  }

  async function typeForFreelancer(el, text) {
    const value = String(text || "").trim();
    const target = el.isContentEditable
      ? el.querySelector('[contenteditable="true"]') || el
      : el;
    target.focus();
    await A.sleep(200);

    if (target.isContentEditable) {
      target.textContent = "";
      target.dispatchEvent(
        new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" })
      );
      const chunk = 12;
      for (let i = 0; i < value.length; i += chunk) {
        const part = value.slice(i, i + chunk);
        document.execCommand("insertText", false, part);
        target.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: part,
          })
        );
        await A.sleep(20);
      }
    } else {
      await A.typeIntoComposer(target, value);
    }

    target.dispatchEvent(new Event("change", { bubbles: true }));
    target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }));
    await A.sleep(400);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GIGSTER_PING") {
      sendResponse({ ok: true, platform: "freelancer" });
      return false;
    }
    if (msg?.type === "READ_MESSAGES") {
      A.dispatchJob("read_messages", () => readThread(msg.username));
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "LIST_UNANSWERED") {
      A.dispatchJob("list_unanswered", listUnansweredThreads);
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "CHECK_USER_REPLIED") {
      A.dispatchJob("check_replied", () =>
        checkUserReplied(msg.username, msg.baseline)
      );
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "VERIFY_NEEDS_REPLY") {
      A.dispatchJob("verify_needs_reply", () => verifyNeedsReply(msg.username));
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "SEND_REPLY") {
      if (msg.mode !== "auto") {
        A.dispatchJob("send_reply", async () => ({
          ok: false,
          error: "Manual mode — copy the draft and send on Freelancer yourself",
        }));
        sendResponse({ ok: true, started: true });
        return false;
      }
      A.dispatchJob("send_reply", async () => {
        const verify = await verifyNeedsReply(msg.username);
        if (!verify.needs_reply) {
          return {
            ok: false,
            error: "Not your turn — client has not replied yet",
          };
        }
        if (msg.username && threadIdFromUrl() !== msg.username) {
          await openThread(msg.username);
          await A.sleep(1200);
        }
        return sendReply(msg.text);
      });
      sendResponse({ ok: true, started: true });
      return false;
    }
    if (msg?.type === "START_REPLY_WATCH") {
      stopReplyWatch();
      const meta = { username: msg.username, baseline: msg.baseline };
      replyWatchTimer = setInterval(() => {
        tickReplyWatch(meta).catch(() => {});
      }, 2000);
      tickReplyWatch(meta).catch(() => {});
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
