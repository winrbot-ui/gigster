import { postThread, postThreadSync } from "../lib/api.js";
import { KEYS } from "../lib/storage.js";

const FIVERR_MATCH = ["*://www.fiverr.com/*", "*://fiverr.com/*"];
const FIVERR_BUNDLE = "src/content/fiverr-inbox.js";
const QUEUE_REPLY_ALARM = "gigster-fiverr-queue-reply";
const QUEUE_SCAN_ALARM = "gigster-fiverr-queue-scan";
const TAB_JOB_TIMEOUT_MS = 90_000;
const REPLY_POLL_MINUTES = 1 / 60;
const IDLE_SCAN_MINUTES = 0.5;
const AUTO_SEND_DELAY_MS = 3000;

/** @type {{ resolve: (v: unknown) => void, reject: (e: Error) => void, timer: ReturnType<typeof setTimeout> } | null} */
let tabJobWait = null;
let queueBusy = false;

async function getQueueState() {
  const data = await chrome.storage.local.get(KEYS.queue);
  return data[KEYS.queue] || { running: false };
}

async function saveQueueState(patch) {
  const current = await getQueueState();
  await chrome.storage.local.set({ [KEYS.queue]: { ...current, ...patch } });
}

function scheduleReplyCheck() {
  chrome.alarms.create(QUEUE_REPLY_ALARM, { delayInMinutes: REPLY_POLL_MINUTES });
}

function scheduleIdleScan() {
  chrome.alarms.create(QUEUE_SCAN_ALARM, { delayInMinutes: IDLE_SCAN_MINUTES });
}

async function clearQueueAlarms() {
  await chrome.alarms.clear(QUEUE_REPLY_ALARM);
  await chrome.alarms.clear(QUEUE_SCAN_ALARM);
}

async function disarmReplyWatch(tabId) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "STOP_REPLY_WATCH" });
  } catch {
    /* tab may be closed */
  }
}

async function armReplyWatch(tabId, username, baseline) {
  if (!tabId) return;
  try {
    await injectContent(tabId);
    await chrome.tabs.sendMessage(tabId, {
      type: "START_REPLY_WATCH",
      username,
      baseline,
    });
  } catch {
    /* ignore */
  }
}

async function getInboxMode() {
  const data = await chrome.storage.local.get(KEYS.inboxMode);
  return data[KEYS.inboxMode] === "auto" ? "auto" : "manual";
}

async function assertAutoMode(action) {
  const mode = await getInboxMode();
  if (mode !== "auto") {
    throw new Error(`Manual mode — extension will not ${action}. Copy the draft and send on Fiverr yourself.`);
  }
}

async function syncCurrentThread(tabId, username, { pendingDraft } = {}) {
  const read = await readTabMessages(tabId, username);
  if (!read?.ok || !read.messages?.length) return null;
  const mode = await getInboxMode();

  return postThreadSync({
    platform: "fiverr",
    thread_id: read.username || username,
    client_name: read.client_name || username,
    messages: read.messages,
    mode,
    pending_assistant_text: pendingDraft || undefined,
  });
}

async function syncActiveThread({ pendingDraft, username: explicitUsername } = {}) {
  const state = await getQueueState();
  const tab = await findFiverrTab();
  let username = explicitUsername || state.username;
  if (!username) {
    const data = await chrome.storage.local.get(KEYS.lastDraft);
    username = data[KEYS.lastDraft]?.username;
  }
  if (!tab?.id || !username) return null;
  try {
    return await syncCurrentThread(tab.id, username, { pendingDraft });
  } catch {
    return null;
  }
}

async function handleUserReplied(username) {
  const state = await getQueueState();
  if (!state.running || state.phase !== "waiting_reply") return;
  if (state.username?.toLowerCase() !== String(username || "").toLowerCase()) return;
  if (queueBusy) return;

  const tab = await findFiverrTab();
  if (tab?.id) {
    await disarmReplyWatch(tab.id);
    try {
      await syncCurrentThread(tab.id, username);
    } catch {
      /* non-fatal */
    }
  }

  await setStatus("Reply sent — checking for next chat…");
  await saveQueueState({ phase: "finding", username: null, baseline: null });
  runQueueStep().catch((e) => setStatus(`Error: ${e.message}`));
}

function buildReplyBaseline(messages) {
  const msgs = messages || [];
  const assistants = msgs.filter((m) => m.role === "assistant");
  return {
    assistantCount: assistants.length,
    messageCount: msgs.length,
    lastWasClient: msgs[msgs.length - 1]?.role === "client",
    lastAssistantText: assistants[assistants.length - 1]?.text || "",
  };
}

async function runQueueStep() {
  if (queueBusy) return;
  const state = await getQueueState();
  if (!state.running) return;

  if (!(await isLoggedIn())) {
    await setStatus("Not logged in");
    await stopQueue();
    return;
  }

  queueBusy = true;
  try {
    const tab = await ensureInboxTab();
    if (!tab?.id) {
      await setStatus("Open fiverr.com/inbox first");
      scheduleIdleScan();
      return;
    }

    if (state.phase === "waiting_reply" && state.username) {
      const label = state.displayName || state.username;
      const check = await sendTabCommand(tab.id, "CHECK_USER_REPLIED", {
        username: state.username,
        baseline: state.baseline,
      });

      if (check?.replied) {
        try {
          await syncCurrentThread(tab.id, state.username);
        } catch {
          /* non-fatal */
        }
        await setStatus("Reply sent — checking for next chat…");
        await saveQueueState({ phase: "finding", username: null, baseline: null });
        queueBusy = false;
        return runQueueStep();
      }

      await setStatus(`Waiting for you to reply to ${label}…`);
      scheduleReplyCheck();
      return;
    }

    await setStatus("Looking for unanswered Fiverr chats…");
    const list = await sendTabCommand(tab.id, "LIST_UNANSWERED");
    const threads = list?.threads || [];

    if (!threads.length) {
      await setStatus("All caught up — watching for new messages…");
      await saveQueueState({ phase: "finding" });
      scheduleIdleScan();
      return;
    }

    const next = threads[0];
    const label = next.displayName || next.username;
    const inboxMode = await getInboxMode();
    await setStatus(`Found ${threads.length} chat(s) — opening ${label}…`);
    await saveQueueState({
      phase: "drafting",
      username: next.username,
      displayName: label,
    });

    const { result, read } = await navigateToChatAndDraft(tab.id, next.username, label);

    if (inboxMode === "auto") {
      await assertAutoMode("send replies");
      await autoSendAndAdvance(tab.id, next.username, read.client_name || label, result);
      queueBusy = false;
      runQueueStep().catch((e) => setStatus(`Error: ${e.message}`));
      return;
    }

    if (!read?.messages?.length) {
      throw new Error(`Could not read chat with ${label}`);
    }

    await saveQueueState({
      phase: "waiting_reply",
      username: next.username,
      displayName: read.client_name || label,
      baseline: buildReplyBaseline(read.messages),
    });
    await setStatus(`Draft ready — copy, paste & send to ${read.client_name || label}`);
    await armReplyWatch(tab.id, next.username, buildReplyBaseline(read.messages));
    scheduleReplyCheck();
  } catch (e) {
    await setStatus(`Error: ${e.message}`);
    const q = await getQueueState();
    if (q.running) scheduleIdleScan();
  } finally {
    queueBusy = false;
  }
}

async function startQueue(inboxMode) {
  await clearQueueAlarms();
  const mode =
    inboxMode === "auto" || inboxMode === "manual"
      ? inboxMode
      : (await chrome.storage.local.get(KEYS.inboxMode))[KEYS.inboxMode] === "auto"
        ? "auto"
        : "manual";
  await chrome.storage.local.set({ [KEYS.inboxMode]: mode });
  await saveQueueState({
    running: true,
    phase: "finding",
    mode,
    username: null,
    baseline: null,
  });
  await chrome.storage.local.set({ [KEYS.autoOpen]: false });
  await setStatus(
    mode === "auto"
      ? "Auto mode — scanning inbox, sending replies…"
      : "Manual mode — scanning inbox, drafting replies…"
  );
  runQueueStep().catch((e) => setStatus(`Error: ${e.message}`));
}

async function autoSendAndAdvance(tabId, username, label, draftResult) {
  await assertAutoMode("send this reply");

  const draftText = draftResult?.draft;
  if (!draftText?.trim()) {
    throw new Error("AI returned an empty draft");
  }

  await setStatus(`Sending reply to ${label}…`);
  const sent = await sendTabCommand(tabId, "SEND_REPLY", {
    text: draftText,
    username,
    mode: "auto",
  });

  if (!sent?.ok) {
    throw new Error(sent?.error || "Could not send on Fiverr — switch to Manual mode");
  }

  await disarmReplyWatch(tabId);
  try {
    await syncCurrentThread(tabId, username);
  } catch {
    /* non-fatal */
  }

  await setStatus(`Sent to ${label} — next chat…`);
  await saveQueueState({ phase: "finding", username: null, baseline: null });
  await new Promise((r) => setTimeout(r, AUTO_SEND_DELAY_MS));
}

async function stopQueue() {
  const tab = await findFiverrTab();
  if (tab?.id) await disarmReplyWatch(tab.id);
  await clearQueueAlarms();
  await chrome.storage.local.set({ [KEYS.queue]: { running: false } });
  await setStatus("Stopped");
}

async function setStatus(text) {
  await chrome.storage.local.set({ [KEYS.status]: text });
}

async function saveDraft(result, meta) {
  await chrome.storage.local.set({
    [KEYS.lastDraft]: {
      draft: result.draft,
      client_name: meta.client_name,
      username: meta.username,
      project_id: result.project_id,
      brief_score: result.brief_score,
      stage: result.stage,
      readiness: result.readiness,
      payment_required: result.payment_required,
      awaiting_brief_decision: result.awaiting_brief_decision,
      brief_decision: result.project_json?.brief_decision,
      message_count: result.message_count,
      at: Date.now(),
    },
  });
}

function clearTabJobWait() {
  if (!tabJobWait) return;
  clearTimeout(tabJobWait.timer);
  tabJobWait = null;
}

function waitForTabJob() {
  clearTabJobWait();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      tabJobWait = null;
      reject(new Error("Fiverr page timeout — refresh the inbox tab"));
    }, TAB_JOB_TIMEOUT_MS);
    tabJobWait = { resolve, reject, timer };
  });
}

function completeTabJob(payload) {
  if (!tabJobWait) return;
  const w = tabJobWait;
  clearTabJobWait();
  if (payload?.ok === false && payload?.error) {
    w.reject(new Error(payload.error));
  } else {
    w.resolve(payload);
  }
}

async function isLoggedIn() {
  const { gigster_access_token: token } = await chrome.storage.local.get("gigster_access_token");
  return Boolean(token);
}

function pickBestFiverrTab(tabs) {
  if (!tabs?.length) return null;
  const withChat = tabs.find((t) => /\/inbox\/[^/]+/i.test(t.url || ""));
  if (withChat) return withChat;
  const inbox = tabs.find((t) => /\/inbox/i.test(t.url || ""));
  if (inbox) return inbox;
  return tabs[0];
}

async function findFiverrTab() {
  const tabs = [];
  for (const pattern of FIVERR_MATCH) {
    const found = await chrome.tabs.query({ url: pattern });
    tabs.push(...found);
  }
  return pickBestFiverrTab(tabs);
}

async function ensureInboxTab() {
  let tab = await findFiverrTab();
  if (tab?.id) return tab;

  tab = await chrome.tabs.create({ url: "https://www.fiverr.com/inbox", active: false });
  await new Promise((r) => setTimeout(r, 3500));
  return tab;
}

async function injectContent(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: "GIGSTER_PING" });
    if (ping?.ok) return;
  } catch {
    /* inject */
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [FIVERR_BUNDLE],
    world: "ISOLATED",
  });
  await new Promise((r) => setTimeout(r, 800));
}

async function sendTabCommand(tabId, type, extra = {}) {
  await injectContent(tabId);
  const resultPromise = waitForTabJob();
  try {
    await chrome.tabs.sendMessage(tabId, { type, ...extra });
  } catch {
    clearTabJobWait();
    throw new Error("Could not reach Fiverr page — refresh the inbox tab");
  }
  return resultPromise;
}

async function readTabMessages(tabId, username) {
  return sendTabCommand(tabId, "READ_MESSAGES", { username });
}

async function analyzeThread(tabId, thread) {
  const { username, displayName, messages: prefetched } = thread;
  const clientName = displayName || username;

  let messages = prefetched;
  let readMeta = null;
  if (!messages?.length) {
    const read = await readTabMessages(tabId, username);
    readMeta = read;
    if (!read?.ok) throw new Error(read?.error || "Could not read messages");
    messages = read.messages || [];
  }

  const clientMsgs = messages.filter((m) => m.role === "client");
  if (!clientMsgs.length) {
    throw new Error("No client messages found — open the chat on Fiverr and refresh");
  }

  await setStatus(`AI drafting for ${readMeta?.client_name || clientName}…`);
  const mode = await getInboxMode();

  const result = await postThread({
    platform: "fiverr",
    thread_id: username,
    client_name: readMeta?.client_name || clientName,
    messages,
    mode,
  });

  await saveDraft(result, {
    client_name: readMeta?.client_name || clientName,
    username,
  });
  await setStatus(
    mode === "auto"
      ? `Draft ready — sending to ${readMeta?.client_name || clientName}…`
      : `Draft ready — ${readMeta?.client_name || clientName} · brief ${result.brief_score}%`
  );

  return result;
}

async function waitForTabReady(tabId, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") return;
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function navigateToChatAndDraft(tabId, username, displayName) {
  const label = displayName || username;
  await setStatus(`Opening ${label}…`);
  await chrome.tabs.update(tabId, {
    url: `https://www.fiverr.com/inbox/${encodeURIComponent(username)}`,
    active: true,
  });
  await waitForTabReady(tabId, 20_000);
  await new Promise((r) => setTimeout(r, 3000));
  await injectContent(tabId);

  const read = await readTabMessages(tabId, username);
  if (!read?.ok || !read.messages?.length) {
    throw new Error(read?.error || `Could not read chat with ${label}`);
  }

  const result = await analyzeThread(tabId, {
    username: read.username || username,
    displayName: read.client_name || displayName || username,
    messages: read.messages,
  });

  return { result, read };
}

async function runDraftCurrentThread() {
  if (!(await isLoggedIn())) {
    await setStatus("Not logged in");
    return;
  }

  const tab = await findFiverrTab();
  if (!tab?.id) {
    await setStatus("Open fiverr.com/inbox first");
    return;
  }

  try {
    await setStatus("Reading messages…");
    const read = await readTabMessages(tab.id);
    if (!read?.ok || !read.messages?.length) {
      await setStatus(read?.error || "No messages in this chat");
      return;
    }

    await analyzeThread(tab.id, {
      username: read.username,
      displayName: read.client_name || read.username,
      messages: read.messages,
    });
  } catch (e) {
    await setStatus(`Error: ${e.message}`);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  /* Queue starts only when user clicks Start */
});

chrome.runtime.onStartup.addListener(() => {
  getQueueState().then(async (q) => {
    if (!q.running) return;
    if (q.phase === "waiting_reply" && q.username) {
      const tab = await findFiverrTab();
      if (tab?.id) await armReplyWatch(tab.id, q.username, q.baseline);
    }
    runQueueStep().catch(() => {});
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GIGSTER_ADAPTER_DONE" || msg?.type === "GIGSTER_FIVERR_DONE") {
    completeTabJob(msg.payload);
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "GIGSTER_USER_REPLIED") {
    handleUserReplied(msg.username);
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "PING_REPLY_CHECK") {
    syncActiveThread().finally(() => {
      runQueueStep().catch((e) => setStatus(`Error: ${e.message}`));
    });
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "SYNC_THREAD") {
    syncActiveThread({ pendingDraft: msg.pendingDraft, username: msg.username })
      .catch(() => {})
      .finally(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "DRAFT_CURRENT") {
    runDraftCurrentThread().catch((e) => setStatus(`Error: ${e.message}`));
    sendResponse({ ok: true, started: true });
    return false;
  }
  if (msg?.type === "START_QUEUE") {
    startQueue(msg.mode).catch((e) => setStatus(`Error: ${e.message}`));
    sendResponse({ ok: true, started: true });
    return false;
  }
  if (msg?.type === "STOP_QUEUE") {
    stopQueue().catch((e) => setStatus(`Error: ${e.message}`));
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "START_AUTO") {
    startQueue("auto").catch((e) => setStatus(`Error: ${e.message}`));
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "STOP_AUTO") {
    stopQueue().catch((e) => setStatus(`Error: ${e.message}`));
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "SESSION_STARTED") {
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === QUEUE_REPLY_ALARM || alarm.name === QUEUE_SCAN_ALARM) {
    getQueueState().then((q) => {
      if (q.running) runQueueStep().catch(() => {});
    });
  }
});
