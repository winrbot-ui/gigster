import { config } from "../config.js";
import { KEYS, get, set } from "./storage.js";
import { refreshAccessToken } from "./auth.js";

const API_TIMEOUT_MS = 120_000;
const SYNC_TIMEOUT_MS = 60_000;

function parseError(res, data) {
  if (res.status === 404) {
    return "Backend not ready — run npm run dev:api and reload the extension";
  }
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
  return data?.error || `Request failed (${res.status})`;
}

async function fetchWithAuth(path, options = {}, timeoutMs = API_TIMEOUT_MS, retried = false) {
  const token = await get(KEYS.accessToken);
  if (!token) throw new Error("Not logged in");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.apiBase}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !retried) {
      await refreshAccessToken();
      return fetchWithAuth(path, options, timeoutMs, true);
    }
    if (!res.ok) throw new Error(parseError(res, data));
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Backend timeout — is npm run dev:api running?");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch(path, options = {}, timeoutMs = API_TIMEOUT_MS) {
  return fetchWithAuth(path, options, timeoutMs);
}

export function postThread(payload) {
  return apiFetch("/ext/thread", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postThreadSync(payload) {
  return apiFetch(
    "/ext/thread",
    {
      method: "POST",
      body: JSON.stringify({ ...payload, sync_only: true }),
    },
    SYNC_TIMEOUT_MS,
  );
}

export function postBriefDecision(projectId, action) {
  return apiFetch("/ext/brief/decision", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, action }),
  });
}

export async function downloadBriefDocument(projectId, format = "pdf") {
  const token = await get(KEYS.accessToken);
  if (!token) throw new Error("Not logged in");
  const res = await fetch(
    `${config.apiBase}/ext/brief/document/${projectId}?format=${format}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 401) {
    await refreshAccessToken();
    return downloadBriefDocument(projectId, format);
  }
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return res.blob();
}

export function getAgent2Status(projectId) {
  return apiFetch(`/ext/agent2/status?project_id=${encodeURIComponent(projectId)}`, {}, 30_000);
}
