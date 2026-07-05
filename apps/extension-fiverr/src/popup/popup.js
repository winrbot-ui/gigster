import { login, logout, getSession, saveAutoDisclaimer } from "../lib/auth.js";
import {
  postBriefDecision,
  downloadBriefDocument,
  getAgent2Status,
} from "../lib/api.js";
import { KEYS, get, set } from "../lib/storage.js";

const $ = (id) => document.getElementById(id);
const PLATFORM = "Fiverr";

const MODE_HINTS = {
  manual: "Manual — AI drafts; you copy & send on Fiverr.",
  auto: "Auto — AI drafts and the extension sends replies on Fiverr.",
};

function bgSend(message) {
  return chrome.runtime.sendMessage(message).catch(() => ({}));
}

function showMain(user) {
  $("login-view").classList.add("hidden");
  $("main-view").classList.remove("hidden");
  const label = user?.username ? `@${user.username}` : user?.email || "member";
  $("user-label").textContent = label;
}

function showLogin() {
  $("main-view").classList.add("hidden");
  $("login-view").classList.remove("hidden");
  $("draft-panel").classList.add("hidden");
  $("brief-choice-panel").classList.add("hidden");
}

function setStatus(text) {
  $("status").textContent = text;
}

function showDraft(data) {
  if (!data?.draft) {
    $("draft-panel").classList.add("hidden");
    updateBriefChoice(data);
    return;
  }
  $("draft-panel").classList.remove("hidden");
  $("draft-client").textContent = data.client_name || data.username || "Client";
  $("draft-score").textContent =
    data.brief_score != null ? `Brief ${data.brief_score}%` : "";
  $("draft-text").value = data.draft;
  updateBriefChoice(data);
}

function updateBriefChoice(data) {
  const panel = $("brief-choice-panel");
  if (!data?.project_id || !data?.readiness?.ready || data?.brief_decision) {
    panel.classList.add("hidden");
    return;
  }
  if (data.awaiting_brief_decision === false && data.brief_decision) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  panel.dataset.projectId = data.project_id;
}

async function loadLastDraft() {
  const data = await get(KEYS.lastDraft);
  if (data) showDraft(data);
}

function setQueueUi(running) {
  $("start-btn").classList.toggle("hidden", running);
  $("stop-btn").classList.toggle("hidden", !running);
  $("queue-badge").classList.toggle("hidden", !running);
  $("mode-manual").disabled = running;
  $("mode-auto").disabled = running;
}

async function updateAutoDisclaimerUi(mode) {
  const box = $("auto-disclaimer");
  const check = $("auto-disclaimer-check");
  const accepted = Boolean(await get(KEYS.autoDisclaimerAccepted));
  if (mode === "auto") {
    box.classList.remove("hidden");
    check.checked = accepted;
  } else {
    box.classList.add("hidden");
  }
  updateStartDisabled(mode, accepted);
}

function updateStartDisabled(mode, accepted) {
  const running = $("stop-btn") && !$("stop-btn").classList.contains("hidden");
  if (running) {
    $("start-btn").disabled = true;
    return;
  }
  $("start-btn").disabled = mode === "auto" && !accepted;
}

function setModeUi(mode) {
  const m = mode === "auto" ? "auto" : "manual";
  $("mode-manual").classList.toggle("active", m === "manual");
  $("mode-auto").classList.toggle("active", m === "auto");
  $("mode-hint").textContent = MODE_HINTS[m];
  $("copy-btn").textContent = m === "auto" ? "Copy draft (preview)" : "Copy draft";
  updateAutoDisclaimerUi(m);
}

async function getSelectedMode() {
  return (await get(KEYS.inboxMode)) === "auto" ? "auto" : "manual";
}

async function syncQueueUi() {
  const queue = await get(KEYS.queue);
  const running = Boolean(queue?.running);
  setQueueUi(running);
  if (queue?.mode) setModeUi(queue.mode);
}

async function triggerBriefDecision(action) {
  const projectId = $("brief-choice-panel").dataset.projectId;
  if (!projectId) return;
  $("brief-choice-status").textContent = "Processing…";
  try {
    const result = await postBriefDecision(projectId, action);
    if (action === "document" || action === "both") {
      const blob = await downloadBriefDocument(projectId, "pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brief-${projectId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    if (action === "build" || action === "both") {
      $("brief-choice-status").textContent = "Agent 2 building…";
      await pollAgent2(projectId);
    } else {
      $("brief-choice-status").textContent = "Brief document downloaded.";
    }
    const last = (await get(KEYS.lastDraft)) || {};
    await set(KEYS.lastDraft, { ...last, brief_decision: action, awaiting_brief_decision: false });
    $("brief-choice-panel").classList.add("hidden");
    setStatus(`Brief decision: ${action}`);
  } catch (ex) {
    $("brief-choice-status").textContent = ex.message;
  }
}

async function pollAgent2(projectId) {
  for (let i = 0; i < 60; i++) {
    const st = await getAgent2Status(projectId);
    if (st.status === "ready" && st.preview_url) {
      $("brief-choice-status").textContent = `Site ready: ${st.preview_url}`;
      return;
    }
    if (st.status === "failed") {
      $("brief-choice-status").textContent = "Agent 2 build failed — retry from dashboard.";
      return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  $("brief-choice-status").textContent = "Still building — check dashboard for preview URL.";
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("login-error");
  err.classList.add("hidden");
  const btn = $("login-btn");
  btn.disabled = true;
  btn.textContent = "Signing in…";
  try {
    const user = await login($("identifier").value.trim(), $("password").value);
    showMain(user);
    await set(KEYS.autoOpen, false);
    setQueueUi(false);
    setStatus("Choose Manual or Auto, then press Start");
    await loadLastDraft();
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Log in";
  }
});

$("logout-btn").addEventListener("click", async () => {
  await bgSend({ type: "STOP_QUEUE" });
  await logout();
  showLogin();
});

for (const btn of [$("mode-manual"), $("mode-auto")]) {
  btn.addEventListener("click", async () => {
    const queue = await get(KEYS.queue);
    if (queue?.running) return;
    const mode = btn.dataset.mode === "auto" ? "auto" : "manual";
    await set(KEYS.inboxMode, mode);
    setModeUi(mode);
  });
}

$("auto-disclaimer-check").addEventListener("change", async (e) => {
  if (e.target.checked) {
    await saveAutoDisclaimer();
  } else {
    await set(KEYS.autoDisclaimerAccepted, false);
  }
  const mode = await getSelectedMode();
  updateStartDisabled(mode, e.target.checked);
});

$("start-btn").addEventListener("click", async () => {
  const mode = await getSelectedMode();
  if (mode === "auto" && !(await get(KEYS.autoDisclaimerAccepted))) {
    setStatus("Accept the Auto mode disclaimer before starting.");
    return;
  }
  $("start-btn").disabled = true;
  setStatus(mode === "auto" ? "Starting auto mode…" : "Starting manual mode…");
  try {
    await bgSend({ type: "START_QUEUE", mode });
    setQueueUi(true);
    setModeUi(mode);
    setStatus(
      mode === "auto"
        ? "Auto — scanning inbox, sending replies…"
        : "Manual — scanning inbox, drafting replies…",
    );
  } catch (ex) {
    setStatus(ex.message || "Could not start");
  } finally {
    const accepted = Boolean(await get(KEYS.autoDisclaimerAccepted));
    updateStartDisabled(mode, accepted);
  }
});

$("stop-btn").addEventListener("click", async () => {
  $("stop-btn").disabled = true;
  try {
    await bgSend({ type: "STOP_QUEUE" });
    setQueueUi(false);
    setStatus("Stopped");
    const mode = await getSelectedMode();
    updateStartDisabled(mode, await get(KEYS.autoDisclaimerAccepted));
  } finally {
    $("stop-btn").disabled = false;
  }
});

$("copy-btn").addEventListener("click", async () => {
  const text = $("draft-text").value;
  if (!text) return;
  await navigator.clipboard.writeText(text);
  const mode = await getSelectedMode();
  setStatus(
    mode === "auto"
      ? "Copied — auto mode still sends on its own"
      : "Copied — paste and send on Fiverr",
  );
  const last = await get(KEYS.lastDraft);
  await bgSend({ type: "SYNC_THREAD", pendingDraft: text, username: last?.username });
  await bgSend({ type: "PING_REPLY_CHECK" });
});

for (const [id, action] of [
  ["brief-build-btn", "build"],
  ["brief-doc-btn", "document"],
  ["brief-both-btn", "both"],
]) {
  $(id).addEventListener("click", () => triggerBriefDecision(action));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[KEYS.status]) {
    setStatus(changes[KEYS.status].newValue);
  }
  if (changes[KEYS.lastDraft]) {
    showDraft(changes[KEYS.lastDraft].newValue);
  }
  if (changes[KEYS.queue]) {
    const q = changes[KEYS.queue].newValue;
    setQueueUi(Boolean(q?.running));
    if (q?.mode) setModeUi(q.mode);
  }
  if (changes[KEYS.inboxMode]) {
    setModeUi(changes[KEYS.inboxMode].newValue);
  }
});

(async () => {
  const savedMode = await get(KEYS.inboxMode);
  setModeUi(savedMode === "auto" ? "auto" : "manual");

  const session = await getSession();
  if (session?.user) {
    showMain(session.user);
    await syncQueueUi();
    const last = await get(KEYS.status);
    setStatus(last || "Choose Manual or Auto, then press Start");
    await loadLastDraft();
  }
})();
