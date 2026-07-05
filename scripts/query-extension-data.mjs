#!/usr/bin/env node
/** Quick peek at extension-saved threads (conversation_messages + projects). */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "infra/supabase/.env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const password = process.env.SUPABASE_DB_PASSWORD?.trim();
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "uyhicdgnaairxuvwfaoo";
const host = process.env.SUPABASE_DB_HOST ?? "aws-1-eu-west-2.pooler.supabase.com";

if (!password) {
  console.error("Set SUPABASE_DB_PASSWORD in infra/supabase/.env");
  process.exit(1);
}

const client = new pg.Client({
  host,
  port: 5432,
  user: `postgres.${projectRef}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();

const { rows: projects } = await client.query(`
  select id, platform, thread_id, client_name, brief_score, status, created_at,
         project_json->>'client_name' as json_client,
         project_json->>'niche' as niche,
         project_json->>'budget' as budget,
         project_json->>'summary' as summary
  from projects
  order by created_at desc
  limit 5
`);

const { rows: counts } = await client.query(`
  select thread_id, platform, count(*)::int as msg_count,
         count(*) filter (where role = 'client')::int as client_msgs,
         count(*) filter (where role = 'assistant')::int as assistant_msgs,
         max(created_at) as last_saved
  from conversation_messages
  group by thread_id, platform
  order by max(created_at) desc
`);

const threadId = counts[0]?.thread_id;
let messages = [];

console.log("\n=== PROJECTS (последни 5) ===\n");
console.table(projects);

console.log("\n=== ПОРАКИ ПО THREAD ===\n");
console.table(counts);

if (threadId) {
  const res = await client.query(
    `
    select role, text, sent_at, created_at
    from conversation_messages
    where thread_id = $1
    order by coalesce(sent_at, created_at), created_at
    `,
    [threadId]
  );
  messages = res.rows;

  console.log(`\n=== РАЗГОВОР: ${threadId} (како што го гледа AI) ===\n`);
  let clientN = 0;
  let youN = 0;
  for (const m of messages) {
    const who = m.role === "client" ? "CLIENT" : "YOU";
    if (m.role === "client") clientN++;
    else youN++;
    const preview = m.text.length > 200 ? m.text.slice(0, 200) + "…" : m.text;
    console.log(`[${who}] ${preview}\n`);
  }
  console.log(`\nВкупно: ${youN} твои (You) + ${clientN} од другата страна (Client)\n`);
} else {
  console.log("\nНема зачувани пораки уште.\n");
}

await client.end();
