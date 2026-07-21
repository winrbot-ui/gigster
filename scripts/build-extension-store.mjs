#!/usr/bin/env node
/**
 * Production extension build + Chrome Web Store zip files.
 * Output: release/gigster-fiverr.zip, release/gigster-freelancer.zip
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
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

  const configPath = join(dist, "src/config.local.js");
  if (existsSync(configPath)) {
    const configText = readFileSync(configPath, "utf8");
    if (/localhost/i.test(configText)) {
      throw new Error(
        `Client store build rejected: ${configPath} still points to localhost. Re-run setup --production.`,
      );
    }
  }

  const devMarker = join(dist, "DEV-NOT-FOR-CLIENTS.txt");
  if (existsSync(devMarker)) {
    rmSync(devMarker);
    console.log("  removed DEV-NOT-FOR-CLIENTS.txt");
  }

  // Chrome Web Store rejects manifest "key" (dev-only for stable unpacked ID).
  const manifestPath = join(dist, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  delete manifest.key;
  if (Array.isArray(manifest.host_permissions)) {
    manifest.host_permissions = manifest.host_permissions.filter(
      (h) => !/^https?:\/\/localhost/i.test(h),
    );
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log("  stripped manifest.key + localhost host_permissions for Web Store");

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
console.log("Note: Store zips omit manifest.key — Google assigns the extension ID after publish.");
console.log("After publish, add the new ID(s) to Railway CORS_EXTENSION_IDS.");
console.log("Dev Load unpacked IDs (with key):", keys.railway.CORS_EXTENSION_IDS);
execSync("python scripts/resize-store-screenshots.py", { cwd: root, stdio: "inherit" });
execSync("python scripts/export-store-upload.py", { cwd: root, stdio: "inherit" });
