const $ = (id) => document.getElementById(id);

const apiUrlEl = $("api-url");
const jwtEl = $("jwt");
const projectIdEl = $("project-id");
const platformEl = $("platform");
const clientNameEl = $("client-name");
const configStatusEl = $("config-status");
const monitorStatusEl = $("monitor-status");
const autoModeEl = $("auto-mode");
const disclaimerEl = $("disclaimer");
const delayMinutesEl = $("delay-minutes");
const clientReadEl = $("client-read");
const draftOutputEl = $("draft-output");

const STORAGE_KEY = "gigster-desktop-config";

async function invoke(cmd, args = {}) {
  if (window.__TAURI__?.core?.invoke) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  return null;
}

function loadLocalConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const cfg = JSON.parse(raw);
    apiUrlEl.value = cfg.apiUrl || "";
    jwtEl.value = cfg.jwt || "";
    projectIdEl.value = cfg.projectId || "";
    platformEl.value = cfg.platform || "upwork";
    clientNameEl.value = cfg.clientName || "";
  } catch {
    /* ignore */
  }
}

function saveLocalConfig() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apiUrl: apiUrlEl.value,
      jwt: jwtEl.value,
      projectId: projectIdEl.value,
      platform: platformEl.value,
      clientName: clientNameEl.value,
    }),
  );
}

async function syncConfigToRust() {
  saveLocalConfig();
  const msg = await invoke("set_config", {
    apiUrl: apiUrlEl.value.trim() || "http://localhost:8000",
    jwtToken: jwtEl.value.trim(),
    projectId: projectIdEl.value.trim(),
    platform: platformEl.value,
    clientName: clientNameEl.value.trim() || "Client",
  });
  configStatusEl.textContent = msg || "Config saved";
}

async function pollStatus() {
  try {
    const state = await invoke("get_monitor_state");
    if (state) {
      const running = state.running ? "running" : "stopped";
      monitorStatusEl.textContent = [
        `Monitor: ${running} · polls every ${state.interval_secs || 20}s`,
        state.last_event ? `Last: ${state.last_event}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      if (state.last_client_text) {
        clientReadEl.textContent = state.last_client_text;
      }
      if (state.last_draft) {
        draftOutputEl.textContent = state.last_draft;
      }
    }
  } catch {
    monitorStatusEl.textContent = "Tauri backend not connected";
  }
}

$("save-config").addEventListener("click", async () => {
  await syncConfigToRust();
});

$("start-monitor").addEventListener("click", async () => {
  if (autoModeEl.checked && !disclaimerEl.checked) {
    monitorStatusEl.textContent = "Accept the disclaimer before Auto mode.";
    return;
  }
  await syncConfigToRust();
  const delay = Math.min(45, Math.max(3, Number(delayMinutesEl.value) || 15));
  const msg = await invoke("start_tab_monitor", {
    autoMode: autoModeEl.checked,
    intervalSecs: 20,
    disclaimerAccepted: disclaimerEl.checked,
    delayMinutes: delay,
  });
  monitorStatusEl.textContent = msg || "Monitor started";
  await pollStatus();
});

$("stop-monitor").addEventListener("click", async () => {
  await invoke("stop_tab_monitor");
  await pollStatus();
});

$("copy-draft").addEventListener("click", async () => {
  try {
    const text = await invoke("copy_draft_to_clipboard");
    if (text) {
      draftOutputEl.textContent = text + "\n\n— Copied to clipboard —";
      setTimeout(() => {
        draftOutputEl.textContent = text;
      }, 1500);
    }
  } catch (err) {
    draftOutputEl.textContent = String(err);
  }
});

loadLocalConfig();
pollStatus();
setInterval(pollStatus, 3000);
