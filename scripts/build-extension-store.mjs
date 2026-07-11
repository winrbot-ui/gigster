#!/usr/bin/env node
/**
 * Production extension build + Chrome Web Store zip files.
 * Output: release/gigster-fiverr.zip, release/gigster-freelancer.zip
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(root, "release");
const keys = JSON.parse(readFileSync(join(root, "infra/chrome-extension-keys.json"), "utf8"));

const extensions = [
  { app: "extension-fiverr", zip: "gigster-fiverr.zip" },
  { app: "extension-freelancer", zip: "gigster-freelancer.zip" },
];

console.log("→ Writing production config.local.js …");
execSync("node scripts/setup-extension.mjs --production", { cwd: root, stdio: "inherit" });

for (const { app, zip } of extensions) {
  console.log(`→ Building ${app} …`);
  execSync(`npm run build --workspace @gigster/${app}`, { cwd: root, stdio: "inherit" });

  const dist = join(root, "apps", app, "dist");
  if (!existsSync(dist)) {
    throw new Error(`Missing dist for ${app}`);
  }

  mkdirSync(releaseDir, { recursive: true });
  const zipPath = join(releaseDir, zip);
  if (existsSync(zipPath)) rmSync(zipPath);

  // Windows-friendly zip (repo dev environment)
  const distGlob = join(dist, "*");
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${distGlob}' -DestinationPath '${zipPath}' -Force"`,
    { cwd: root, stdio: "inherit" },
  );
  console.log("Created", zipPath);
}

console.log("\nDone. Upload zips from release/ to Chrome Web Store Developer Dashboard.");
console.log("Extension IDs (stable):", keys.railway.CORS_EXTENSION_IDS);
console.log("Set Railway CORS_EXTENSION_IDS to that value, or run: npm run sync:railway");
