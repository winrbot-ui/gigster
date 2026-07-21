import { postThread, postThreadSync } from "../lib/api.js";
import { KEYS } from "../lib/storage.js";

const FREELANCER_MATCH = [
  "*://www.freelancer.com/*",
  "*://www.freelancer.com.au/*",
];
const FREELANCER_BUNDLES = [
  "src/content/adapter-base.js",
  "src/content/freelancer-inbox.js",
];
const QUEUE_REPLY_ALARM = "gigster-freelancer-queue-reply";
const QUEUE_SCAN_ALARM = "gigster-freelancer-queue-scan";
const TAB_JOB_TIMEOUT_MS = 90_000;
const REPLY_POLL_MINUTES = 1 / 60;
const IDLE_SCAN_MINUTES = 0.5;
const AUTO_SEND_DELAY_MS = 3000;

function formatClientLabel(meta) {
  if (!meta) return "client";
  if (meta.client_name && meta.client_username) {
    return `${meta.client_name} @${meta.client_username}`;
  }
  return meta.client_name || meta.client_username || meta.displayName || meta.username || "client";
}

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
    throw new Error(
      `Manual mode — extension will not ${action}. Copy the draft and send on Freelancer yourself.`
    );
  }
}

async function syncCurrentThread(tabId, username, { pendingDraft } = {}) {
  const read = await readTabMessages(tabId, username);
  if (!read?.ok || !read.messages?.length) return null;
  const mode = await getInboxMode();

  return postThreadSync({
    platform: "freelancer",
    thread_id: read.username || username,
    client_name: read.client_name || username,
    client_username: read.client_username || undefined,
    messages: read.messages,
    mode,
    pending_assistant_text: pendingDraft || undefined,
  });
}

async function syncActiveThread({ pendingDraft, username: explicitUsername } = {}) {
  const state = await getQueueState();
  const tab = await findFreelancerTab();
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

async function recheckMembership() {
  const result = await syncActiveThread();
  if (!result) {
    return { ok: false, error: "Open the Freelancer chat for this deal, then recheck." };
  }
  const data = await chrome.storage.local.get(KEYS.lastDraft);
  const last = data[KEYS.lastDraft] || {};
  await chrome.storage.local.set({
    [KEYS.lastDraft]: {
      ...last,
      project_id: result.project_id ?? last.project_id,
      readiness: result.readiness ?? last.readiness,
      payment_required: result.payment_required,
      awaiting_brief_decision: result.awaiting_brief_decision,
      brief_decision: result.project_json?.brief_decision ?? last.brief_decision,
    },
  });
  return { ok: true, payment_required: Boolean(result.payment_required) };
}

async function handleUserReplied(username) {
  const state = await getQueueState();
  if (!state.running || state.phase !== "waiting_reply") return;
  if (state.username?.toLowerCase() !== String(username || "").toLowerCase()) return;
  if (queueBusy) return;

  const tab = await findFreelancerTab();
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

  const { queue_user_started: userStarted } = await chrome.storage.session.get(
    "queue_user_started"
  );
  if (!userStarted) {
    const stale = await getQueueState();
    if (stale.running) await stopQueue();
    return;
  }

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
      await setStatus("Open freelancer.com/messages first");
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

    await setStatus("Looking for unanswered Freelancer chats…");
    const list = await sendTabCommand(tab.id, "LIST_UNANSWERED");
    const threads = list?.threads || [];

    if (!threads.length) {
      await setStatus("All caught up — watching for new messages…");
      await saveQueueState({ phase: "finding" });
      scheduleIdleScan();
      return;
    }

    const next = threads[0];
    const label = formatClientLabel(next);
    const inboxMode = await getInboxMode();
    await setStatus(`Found ${threads.length} chat(s) — opening ${label}…`);
    await saveQueueState({
      phase: "drafting",
      username: next.username,
      displayName: label,
    });

    const { result, read, skipped } = await navigateToChatAndDraft(
      tab.id,
      next.username,
      label,
      next
    );

    if (skipped) {
      await saveQueueState({ phase: "finding", username: null, baseline: null });
      queueBusy = false;
      runQueueStep().catch((e) => setStatus(`Error: ${e.message}`));
      return;
    }

    if (inboxMode === "auto") {
      await assertAutoMode("send replies");
      await autoSendAndAdvance(tab.id, next.username, formatClientLabel(read), result);
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
      displayName: formatClientLabel(read),
      baseline: buildReplyBaseline(read.messages),
    });
    await setStatus(
      `Draft ready — copy, paste & send to ${formatClientLabel(read)}`
    );
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
  await chrome.storage.session.set({ queue_user_started: true });
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

  const verify = await sendTabCommand(tabId, "VERIFY_NEEDS_REPLY", { username });
  if (!verify?.needs_reply) {
    await setStatus(`Skipping ${label} — you already replied`);
    await saveQueueState({ phase: "finding", username: null, baseline: null });
    return;
  }

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
    throw new Error(sent?.error || "Could not send on Freelancer — switch to Manual mode");
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
  const tab = await findFreelancerTab();
  if (tab?.id) await disarmReplyWatch(tab.id);
  await clearQueueAlarms();
  await chrome.storage.session.remove("queue_user_started");
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
      client_username: meta.client_username || null,
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
      reject(new Error("Freelancer page timeout — refresh the messages tab"));
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

function pickBestFreelancerTab(tabs) {
  if (!tabs?.length) return null;
  const thread = tabs.find((t) => /\/messages\/thread\/\d+/i.test(t.url || ""));
  if (thread) return thread;
  const legacy = tabs.find((t) => /\/messages\/\d+/i.test(t.url || ""));
  if (legacy) return legacy;
  const inbox = tabs.find((t) => /\/messages/i.test(t.url || ""));
  if (inbox) return inbox;
  return tabs[0];
}

async function findFreelancerTab() {
  const tabs = [];
  for (const pattern of FREELANCER_MATCH) {
    const found = await chrome.tabs.query({ url: pattern });
    tabs.push(...found);
  }
  return pickBestFreelancerTab(tabs);
}

async function ensureInboxTab() {
  let tab = await findFreelancerTab();
  if (tab?.id) return tab;

  tab = await chrome.tabs.create({
    url: "https://www.freelancer.com/messages/",
    active: false,
  });
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

  for (const file of FREELANCER_BUNDLES) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file],
      world: "ISOLATED",
    });
  }
  await new Promise((r) => setTimeout(r, 800));
}

async function sendTabCommand(tabId, type, extra = {}) {
  await injectContent(tabId);
  const resultPromise = waitForTabJob();
  try {
    await chrome.tabs.sendMessage(tabId, { type, ...extra });
  } catch {
    clearTabJobWait();
    throw new Error("Could not reach Freelancer page — refresh the messages tab");
  }
  return resultPromise;
}

async function readTabMessages(tabId, username) {
  return sendTabCommand(tabId, "READ_MESSAGES", { username });
}

async function analyzeThread(tabId, thread) {
  const {
    username,
    displayName,
    client_name: threadName,
    client_username: threadHandle,
    messages: prefetched,
  } = thread;

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
    throw new Error("No client messages found — open the chat on Freelancer and refresh");
  }

  const last = messages[messages.length - 1];
  if (last?.role === "assistant") {
    throw new Error("Already replied — last message is yours");
  }

  const resolvedName = readMeta?.client_name || threadName || null;
  const resolvedUsername = readMeta?.client_username || threadHandle || null;
  const resolvedLabel = formatClientLabel({
    client_name: resolvedName,
    client_username: resolvedUsername,
    displayName,
    username,
  });

  await setStatus(`AI drafting for ${resolvedLabel}…`);
  const mode = await getInboxMode();

  const result = await postThread({
    platform: "freelancer",
    thread_id: username,
    client_name: resolvedName || resolvedUsername || username,
    client_username: resolvedUsername || undefined,
    messages,
    mode,
  });

  await saveDraft(result, {
    client_name: resolvedName,
    client_username: resolvedUsername,
    username,
  });
  await setStatus(
    mode === "auto"
      ? `Draft ready — sending to ${resolvedLabel}…`
      : `Draft ready — ${resolvedLabel} · brief ${result.brief_score}%`
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

async function navigateToChatAndDraft(tabId, username, displayName, threadMeta = {}) {
  const label = displayName || username;
  await setStatus(`Opening ${label}…`);
  await chrome.tabs.update(tabId, {
    url: `https://www.freelancer.com/messages/thread/${encodeURIComponent(username)}`,
    active: true,
  });
  await waitForTabReady(tabId, 20_000);
  await new Promise((r) => setTimeout(r, 3000));
  await injectContent(tabId);

  const read = await readTabMessages(tabId, username);
  if (read?.already_replied) {
    await setStatus(`Already replied to ${formatClientLabel(read)} — next chat…`);
    return { skipped: true, result: null, read };
  }
  if (!read?.ok || !read.messages?.length) {
    throw new Error(read?.error || `Could not read chat with ${label}`);
  }

  const verify = await sendTabCommand(tabId, "VERIFY_NEEDS_REPLY", { username });
  if (!verify?.needs_reply) {
    await setStatus(`Skipping ${formatClientLabel(read)} — not waiting for a reply`);
    return { skipped: true, result: null, read };
  }

  const lastMsg = read.messages[read.messages.length - 1];
  if (lastMsg?.role === "assistant") {
    await setStatus(`Already replied to ${formatClientLabel(read)} — next chat…`);
    return { skipped: true, result: null, read };
  }

  let result;
  try {
    result = await analyzeThread(tabId, {
      username: read.username || username,
      displayName: label,
      client_name: read.client_name || threadMeta.client_name || null,
      client_username: read.client_username || threadMeta.client_username || null,
      messages: read.messages,
    });
  } catch (e) {
    if (/already replied/i.test(e.message)) {
      await setStatus(`Already replied to ${formatClientLabel(read)} — next chat…`);
      return { skipped: true, result: null, read };
    }
    throw e;
  }

  return { result, read };
}

async function runDraftCurrentThread() {
  if (!(await isLoggedIn())) {
    await setStatus("Not logged in");
    return;
  }

  const tab = await findFreelancerTab();
  if (!tab?.id) {
    await setStatus("Open freelancer.com/messages first");
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
  chrome.storage.session.remove("queue_user_started").catch(() => {});
  stopQueue().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.session.remove("queue_user_started").catch(() => {});
  stopQueue().catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GIGSTER_ADAPTER_DONE" || msg?.type === "GIGSTER_FREELANCER_DONE") {
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
    getQueueState().then((q) => {
      if (!q.running) return;
      syncActiveThread().finally(() => {
        runQueueStep().catch((e) => setStatus(`Error: ${e.message}`));
      });
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
  if (msg?.type === "RECHECK_MEMBERSHIP") {
    recheckMembership()
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
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
