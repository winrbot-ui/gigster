/** Shared login across Gigster extensions; queue/draft keys are per marketplace. */
export const KEYS = {
  accessToken: "gigster_access_token",
  refreshToken: "gigster_refresh_token",
  user: "gigster_user",
  autoOpen: "gigster_freelancer_auto_open",
  inboxMode: "gigster_freelancer_inbox_mode",
  queue: "gigster_freelancer_queue",
  status: "gigster_freelancer_status",
  lastDraft: "gigster_freelancer_last_draft",
  autoDisclaimerAccepted: "gigster_freelancer_auto_disclaimer",
};

export async function get(key) {
  const data = await chrome.storage.local.get(key);
  return data[key];
}

export async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function remove(key) {
  await chrome.storage.local.remove(key);
}

export async function clearSession() {
  await chrome.storage.local.remove([
    KEYS.accessToken,
    KEYS.refreshToken,
    KEYS.user,
  ]);
}
