import { config } from "../config.js";
import { KEYS, set, clearSession, get } from "./storage.js";

export async function login(identifier, password) {
  const res = await fetch(`${config.apiBase}/auth/extension-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    const msg =
      res.status === 404
        ? "Backend not ready — run npm run dev:api"
        : typeof d === "string"
          ? d
          : Array.isArray(d)
            ? d[0]?.msg
            : data.error;
    throw new Error(msg || "Login failed");
  }
  await set(KEYS.accessToken, data.access_token);
  if (data.refresh_token) await set(KEYS.refreshToken, data.refresh_token);
  await set(KEYS.user, data.user);
  return data.user;
}

export async function logout() {
  await clearSession();
}

export async function getSession() {
  const data = await chrome.storage.local.get([KEYS.accessToken, KEYS.user]);
  if (!data[KEYS.accessToken]) return null;
  return { token: data[KEYS.accessToken], user: data[KEYS.user] };
}

/** Refresh access token via backend (uses stored refresh_token). */
export async function refreshAccessToken() {
  const refreshToken = await get(KEYS.refreshToken);
  if (!refreshToken) {
    await clearSession();
    throw new Error("Session expired — log in again");
  }
  const res = await fetch(`${config.apiBase}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    await clearSession();
    const d = data.detail;
    throw new Error(typeof d === "string" ? d : "Session expired — log in again");
  }
  await set(KEYS.accessToken, data.access_token);
  if (data.refresh_token) await set(KEYS.refreshToken, data.refresh_token);
  return data.access_token;
}

export async function saveAutoDisclaimer() {
  await set(KEYS.autoDisclaimerAccepted, true);
  const token = await get(KEYS.accessToken);
  if (!token) return;
  try {
    await fetch(`${config.apiBase}/ext/auto-settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ disclaimer_accepted: true, enabled: true }),
    });
  } catch {
    /* local consent still counts */
  }
}
