#!/usr/bin/env node
/**
 * Apply infra/supabase/migrations/*.sql in filename order.
 * Usage: SUPABASE_DB_PASSWORD=... node infra/supabase/apply-migrations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "migrations");

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Set SUPABASE_DB_PASSWORD (database password from Supabase dashboard).");
  process.exit(1);
}

const projectRef =
  process.env.SUPABASE_PROJECT_REF ?? "uyhicdgnaairxuvwfaoo";
const usePooler = process.env.SUPABASE_USE_POOLER !== "0";
const port = Number(process.env.SUPABASE_DB_PORT ?? 5432);

const regions = (
  process.env.SUPABASE_REGION
    ? [process.env.SUPABASE_REGION]
    : [
        "eu-central-1",
        "eu-central-2",
        "eu-west-1",
        "eu-west-2",
        "eu-west-3",
        "eu-north-1",
        "us-east-1",
        "us-east-2",
        "us-west-1",
        "us-west-2",
        "ap-southeast-1",
        "ap-southeast-2",
        "ap-northeast-1",
        "ap-northeast-2",
        "sa-east-1",
        "ca-central-1",
      ]
);

const poolerClusters = ["aws-0", "aws-1", "aws-2"];
const poolerPorts = [5432, 6543];

async function connectClient() {
  let lastErr;
  const attempts = [];

  if (process.env.SUPABASE_DB_HOST) {
    attempts.push({
      host: process.env.SUPABASE_DB_HOST,
      port: port,
      user: process.env.SUPABASE_DB_USER ?? `postgres.${projectRef}`,
    });
  }

  if (usePooler) {
    for (const cluster of poolerClusters) {
      for (const region of regions) {
        for (const p of poolerPorts) {
          attempts.push({
            host: `${cluster}-${region}.pooler.supabase.com`,
            port: p,
            user: `postgres.${projectRef}`,
          });
        }
      }
    }
  } else {
    attempts.push({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      user: "postgres",
    });
  }

  for (const { host, port: attemptPort, user } of attempts) {
    const client = new pg.Client({
      host,
      port: attemptPort,
      user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      console.log(`Connected via ${host}:${attemptPort} (${user})`);
      return client;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("tenant/user") ||
        msg.includes("Tenant or user not found") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("timeout") ||
        msg.includes("ETIMEDOUT")
      ) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("Could not connect to Supabase Postgres");
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

async function main() {
  const client = await connectClient();

  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const { rows } = await client.query(
      "select 1 from supabase_migrations.schema_migrations where version = $1",
      [version],
    );
    if (rows.length > 0) {
      console.log(`skip ${file} (already applied)`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`apply ${file}...`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into supabase_migrations.schema_migrations (version) values ($1)",
        [version],
      );
      await client.query("commit");
      console.log(`ok ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }

  const { rows: tables } = await client.query(`
    select tablename from pg_tables
    where schemaname = 'public'
    order by tablename
  `);
  console.log("\nPublic tables:", tables.map((r) => r.tablename).join(", "));
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
