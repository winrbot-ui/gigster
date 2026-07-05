/**
 * Upwork inbox adapter — read/send messages via DOM (ab/messages).
 */
(function gigsterUpwork() {
  if (window.__gigsterUpwork) return;
  window.__gigsterUpwork = true;

  const A = window.GigsterAdapter;
  if (!A) {
    console.error("Gigster: adapter-base.js must load before upwork-inbox.js");
    return;
  }

  function threadIdFromUrl() {
    let m = window.location.pathname.match(/\/rooms\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]);
    m = window.location.pathname.match(/\/messages\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]);
    const q = new URLSearchParams(window.location.search);
    return q.get("roomId") || q.get("room_id") || null;
  }

  function contactNameFromPage() {
    const h = document.querySelector(
      'h1, [class*="room-title"], [class*="partner-name"], [class*="interlocutor"]'
    );
    return (h?.textContent || "").trim() || null;
  }

  function getSidebarRoot() {
    const candidates = document.querySelectorAll(
      '[class*="rooms-list"], [class*="room-list"], [class*="conversations-list"], aside, nav'
    );
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      const score = el.querySelectorAll('a[href*="/rooms/"], a[href*="/messages/"]').length;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function threadIdFromHref(href) {
    const s = String(href || "");
    let m = s.match(/\/rooms\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]);
    m = s.match(/\/messages\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function rowLooksUnread(row) {
    if (!row) return false;
    const cls = String(row.className || "").toLowerCase();
    if (cls.includes("unread")) return true;
    if (row.querySelector('[class*="unread"], [class*="badge"]')) return true;
    const style = window.getComputedStyle(row);
    if (parseInt(style.fontWeight, 10) >= 600) return true;
    return false;
  }

  function readMessagesFromDom() {
    const roots = [
      document.querySelector('[class*="room-messages"]'),
      document.querySelector('[class*="message-list"]'),
      document.querySelector('[class*="story-messages"]'),
      document.querySelector('[data-test="messages"]'),
      document.querySelector("main"),
    ].filter(Boolean);

    const root = roots[0] || document.body;
    const selectors = [
      '[data-test="message"]',
      '[class*="message-bubble"]',
      '[class*="msg-card"]',
      '[class*="story-message"]',
      '[class*="chat-message"]',
    ];

    let rows = [];
    for (const sel of selectors) {
      root.querySelectorAll(sel).forEach((el) => rows.push(el));
      if (rows.length >= 2) break;
    }

    if (rows.length < 2) {
      rows = [];
      root.querySelectorAll('[class*="message"]').forEach((el) => {
        const t = (el.innerText || "").trim();
        if (t.length > 2 && t.length < 2000) rows.push(el);
      });
    }

    const out = [];
    for (const row of rows) {
      const msgText = A.extractTextFromRow(row);
      if (!msgText || msgText.length < 2 || A.isBlobMessage(msgText)) continue;
      out.push({
        role: A.rowLooksMine(row) ? "assistant" : "client",
        text: msgText,
        sent_at: null,
      });
    }
    return A.finalizeMessages(out);
  }

  async function openThread(threadId) {
    if (!threadId) return false;
    if (threadIdFromUrl() === threadId) return true;
    window.location.href = `https://www.upwork.com/ab/messages/rooms/${encodeURIComponent(threadId)}`;
    await A.sleep(2500);
    return threadIdFromUrl() === threadId;
  }

  async function readThread(username) {
    const threadId = username || threadIdFromUrl();
    if (!threadId) {
      return { ok: false, error: "Open an Upwork message room first" };
    }

    if (username && threadIdFromUrl() !== username) {
      await openThread(username);
    }

    await A.sleep(600);
    const messages = readMessagesFromDom();
    const clientName = contactNameFromPage() || threadId;

    if (!messages.length) {
      return {
        ok: false,
        error: "Could not read messages — refresh Upwork and open the room",
        username: threadId,
        messages: [],
      };
    }

    return {
      ok: true,
      username: threadId,
      client_name: clientName,
      messages,
      message_count: messages.length,
    };
  }

  async function listUnansweredThreads() {
    const threads = [];
    const seen = new Set();
    const root = getSidebarRoot() || document.body;

    const links = root.querySelectorAll('a[href*="/rooms/"], a[href*="/messages/"]');
    for (const link of links) {
      const threadId = threadIdFromHref(link.href || link.getAttribute("href"));
      if (!threadId || seen.has(threadId)) continue;
      const row = link.closest("li, [role='listitem'], div");
      if (row && !rowLooksUnread(row)) continue;
      seen.add(threadId);
      const label =
        String(link.textContent || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)[0] || threadId;
      threads.push({
        username: threadId,
        displayName: label,
        priority: Date.now(),
      });
    }

    if (!threads.length) {
      for (const link of links) {
        const threadId = threadIdFromHref(link.href || link.getAttribute("href"));
        if (!threadId || seen.has(threadId)) continue;
        seen.add(threadId);
        const label =
          String(link.textContent || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)[0] || threadId;
        threads.push({ username: threadId, displayName: label, priority: 0 });
      }
    }

    threads.sort((a, b) => b.priority - a.priority);
    return { ok: true, threads, count: threads.length };
  }

  async function checkUserReplied(username, baseline) {
    const base = baseline || {};
    const read = await readThread(username);
    if (!read.ok) return { ok: false, error: read.error };

    const msgs = read.messages || [];
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

  async function sendReply(text) {
    return A.sendReply(text, async (body) => {
      const msgs = readMessagesFromDom();
      const last = msgs[msgs.length - 1];
      const normBody = A.normalizeForDedupe(body);
      const normLast = last?.text ? A.normalizeForDedupe(last.text) : "";
      return (
        last?.role === "assistant" &&
        (normLast === normBody || normLast.includes(normBody.slice(0, 40)))
      );
    });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GIGSTER_PING") {
      sendResponse({ ok: true, platform: "upwork" });
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
    if (msg?.type === "SEND_REPLY") {
      A.dispatchJob("send_reply", async () => {
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
