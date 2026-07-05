/**
 * Shared DOM helpers for marketplace inbox adapters (Upwork, Freelancer).
 */
(function gigsterAdapterBase() {
  if (window.GigsterAdapter) return;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function cleanMessageText(text) {
    return String(text || "")
      .replace(/\bShare feedback\b/gi, "")
      .replace(/\bTranslate to English\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isBoilerplateOnly(text) {
    const t = String(text || "").trim();
    if (!t || t.length < 2) return true;
    if (/^we have your back/i.test(t)) return true;
    return false;
  }

  function isBlobMessage(text) {
    const t = String(text || "");
    if (t.length > 2000) return true;
    const dates = t.match(
      /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi
    );
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
        (other, j) =>
          j !== i && other.includes(m.text) && other.length > m.text.length + 50
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

  function findComposerRoot() {
    return (
      document.querySelector('[class*="composer"]') ||
      document.querySelector('[class*="message-input"]') ||
      document.querySelector('[class*="conversation"] footer') ||
      document.querySelector('[class*="chat"] footer') ||
      document.querySelector("footer") ||
      document.querySelector("main")
    );
  }

  function findComposer() {
    const root = findComposerRoot() || document.body;
    const selectors = [
      '[data-testid="message-input"]',
      '[data-test="message-input"]',
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

  function findSendButtonNear(composer) {
    if (!composer) return null;
    let scope =
      composer.closest(
        'form, [class*="composer"], [class*="Composer"], [class*="message-input"], [class*="footer"]'
      ) || composer.parentElement;
    if (scope?.parentElement) scope = scope.parentElement;

    const composerRect = composer.getBoundingClientRect();
    const candidates = scope
      ? scope.querySelectorAll('button, [role="button"], a[role="button"]')
      : document.querySelectorAll('button, [role="button"]');

    let iconBtn = null;
    for (const btn of candidates) {
      if (btn.disabled) continue;
      const r = btn.getBoundingClientRect();
      if (r.width < 16 || r.height < 16 || r.width > 96 || r.height > 96) continue;

      const label = `${btn.textContent || ""} ${btn.getAttribute("aria-label") || ""} ${btn.getAttribute("title") || ""}`.toLowerCase();
      if (/send|submit|post message|reply/i.test(label)) return btn;

      const nearY = Math.abs(r.top - composerRect.top) < 140;
      const nearX = r.left >= composerRect.left - 40 && r.left <= composerRect.right + 200;
      const hasIcon = btn.querySelector("svg, [class*='icon'], fl-icon, i, use");
      if (hasIcon && nearY && nearX) {
        if (!iconBtn || r.width < 72) iconBtn = btn;
      }
    }
    return iconBtn;
  }

  function findSendButton(composer) {
    const root = findComposerRoot() || document.body;
    const candidates = [
      ...root.querySelectorAll('button[data-testid="send-button"]'),
      ...root.querySelectorAll('button[data-test="send"]'),
      ...root.querySelectorAll('button[aria-label*="Send" i]'),
      ...root.querySelectorAll('button[title*="Send" i]'),
      ...root.querySelectorAll('button[type="submit"]'),
    ];
    for (const btn of candidates) {
      const label = `${btn.textContent || ""} ${btn.getAttribute("aria-label") || ""} ${btn.getAttribute("title") || ""}`.trim();
      if (!/send|submit|reply/i.test(label) && btn.type !== "submit") continue;
      if (btn.disabled) continue;
      const r = btn.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      return btn;
    }
    return findSendButtonNear(composer || findComposer());
  }

  function getComposerText(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value || "";
    return el.innerText || el.textContent || "";
  }

  function composerStillHasDraft(composer, body) {
    const remaining = getComposerText(composer).trim();
    if (!remaining || remaining.length < 8) return false;
    const a = normalizeForDedupe(remaining);
    const b = normalizeForDedupe(body);
    return a.includes(b.slice(0, Math.min(40, b.length))) || b.includes(a.slice(0, 40));
  }

  async function clickSendButton(btn) {
    if (!btn) return;
    const targets = [btn];
    const inner = btn.querySelector("button, [role='button'], a");
    if (inner) targets.push(inner);
    for (const t of targets) {
      t.focus?.();
      t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      t.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
      t.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      t.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      t.click();
    }
  }

  async function pressEnterToSend(el) {
    for (const type of ["keydown", "keypress", "keyup"]) {
      el.dispatchEvent(
        new KeyboardEvent(type, {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        })
      );
    }
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

  async function sendReply(text, verifyLastMessage) {
    const body = String(text || "").trim();
    if (!body) return { ok: false, error: "Empty draft" };

    await sleep(500);
    const composer = findComposer();
    if (!composer) {
      return { ok: false, error: "Message box not found — refresh the chat page" };
    }

    await typeIntoComposer(composer, body);
    await sleep(600);

    let sendBtn = findSendButton(composer);
    if (sendBtn) await clickSendButton(sendBtn);
    else {
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

    if (composerStillHasDraft(composer, body)) {
      sendBtn = findSendButton(composer) || findSendButtonNear(composer);
      if (sendBtn) {
        await clickSendButton(sendBtn);
        await sleep(1500);
      }
      const form = composer.closest("form");
      if (form && composerStillHasDraft(composer, body)) {
        try {
          form.requestSubmit();
        } catch {
          /* ignore */
        }
        await sleep(1500);
      }
    }

    if (composerStillHasDraft(composer, body)) {
      return {
        ok: false,
        error: "Could not click Send — message is still in the box",
      };
    }

    if (typeof verifyLastMessage === "function") {
      const ok = await verifyLastMessage(body);
      if (ok) return { ok: true, sent: true };
    }

    return { ok: true, sent: true };
  }

  function rowLooksMine(row) {
    if (!row) return false;
    const text = row.innerText || "";
    if (/^\s*Me\b/m.test(text)) return true;
    const cls = `${row.className || ""}`.toLowerCase();
    if (
      cls.includes("outgoing") ||
      cls.includes("mine") ||
      cls.includes("self") ||
      cls.includes("from-me") ||
      cls.includes("is-me") ||
      cls.includes("sent")
    ) {
      return true;
    }
    if (
      cls.includes("incoming") ||
      cls.includes("from-them") ||
      cls.includes("received")
    ) {
      return false;
    }
    const align = window.getComputedStyle(row).alignSelf;
    if (align === "flex-end") return true;
    if (align === "flex-start") return false;
    return false;
  }

  function extractTextFromRow(row) {
    const text = (row.innerText || row.textContent || "").trim();
    if (!text || text.length < 2) return "";
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
    return cleanMessageText(body.join(" "));
  }

  function pushResult(job, payload) {
    chrome.runtime
      .sendMessage({ type: "GIGSTER_ADAPTER_DONE", job, payload })
      .catch(() => {});
    chrome.runtime
      .sendMessage({ type: "GIGSTER_FREELANCER_DONE", job, payload })
      .catch(() => {});
  }

  function dispatchJob(job, fn) {
    Promise.resolve()
      .then(fn)
      .then((payload) => pushResult(job, payload))
      .catch((e) => pushResult(job, { ok: false, error: e.message }));
  }

  window.GigsterAdapter = {
    sleep,
    cleanMessageText,
    isBoilerplateOnly,
    isBlobMessage,
    dedupeMessages,
    finalizeMessages,
    normalizeForDedupe,
    findComposer,
    findSendButton,
    typeIntoComposer,
    sendReply,
    clickSendButton,
    pressEnterToSend,
    getComposerText,
    composerStillHasDraft,
    findSendButtonNear,
    rowLooksMine,
    extractTextFromRow,
    pushResult,
    dispatchJob,
  };
})();
