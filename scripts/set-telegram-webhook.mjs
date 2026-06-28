/**
 * Register Telegram webhook after Railway deploy.
 * Run: node scripts/set-telegram-webhook.mjs
 * Requires apps/backend/.env or Railway env vars loaded locally.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    const env = {};
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = {
  ...loadEnv(join(root, "apps/backend/.env")),
  ...loadEnv(join(root, "apps/web/.env.local")),
  ...process.env,
};

const token = env.TELEGRAM_BOT_TOKEN;
const apiUrl = (env.GIGSTER_API_URL || env.RAILWAY_PUBLIC_DOMAIN || "").replace(/\/$/, "");
const secret = env.TELEGRAM_WEBHOOK_SECRET || env.CRON_SECRET || "gigster-webhook";

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}
if (!apiUrl || apiUrl.includes("localhost")) {
  console.error("Set GIGSTER_API_URL to your Railway public URL (https://....up.railway.app)");
  process.exit(1);
}

const webhookUrl = `${apiUrl}/telegram/webhook/${secret}`;

const resp = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
});
const data = await resp.json();
console.log(JSON.stringify(data, null, 2));
if (!data.ok) process.exit(1);
console.log("\nWebhook URL:", webhookUrl);
