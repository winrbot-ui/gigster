#!/usr/bin/env node
import { mkdirSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "icons");
const dist = join(root, "dist");
const sharedIcons = join(root, "..", "extension-fiverr", "icons");

mkdirSync(iconsDir, { recursive: true });
for (const size of [16, 48, 128]) {
  cpSync(join(sharedIcons, `icon${size}.png`), join(iconsDir, `icon${size}.png`));
}

mkdirSync(dist, { recursive: true });

const localConfig = join(root, "src/config.local.js");
if (!existsSync(localConfig)) {
  cpSync(join(root, "src/config.defaults.js"), localConfig);
  console.log("Created src/config.local.js from defaults");
}

for (const item of ["manifest.json", "src", "icons"]) {
  cpSync(join(root, item), join(dist, item), { recursive: true });
}
console.log("Built", dist);
