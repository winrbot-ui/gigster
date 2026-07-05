#!/usr/bin/env node
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "icons");
const dist = join(root, "dist");

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  let c = ~0;
  const buf = Buffer.concat([typeBuf, data]);
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(~c >>> 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function solidPng(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(iconsDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const p = join(iconsDir, `icon${size}.png`);
  if (!existsSync(p)) writeFileSync(p, solidPng(size, 200, 168, 106));
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
