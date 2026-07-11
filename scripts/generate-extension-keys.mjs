#!/usr/bin/env node
/**
 * Generate a stable Chrome extension ID from an RSA public key (manifest "key" field).
 * Chrome algorithm: SHA-256 of DER SubjectPublicKeyInfo → 32-char a-p string.
 */
import { generateKeyPairSync, createHash } from "node:crypto";

function extensionIdFromDerPublicKey(derPublicKey) {
  const hash = createHash("sha256").update(derPublicKey).digest();
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += String.fromCharCode(97 + (hash[i] >> 4));
    id += String.fromCharCode(97 + (hash[i] & 0x0f));
  }
  return id;
}

function generateExtensionKey(label) {
  const { publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const keyBase64 = publicKey.toString("base64");
  const extensionId = extensionIdFromDerPublicKey(publicKey);
  return { label, keyBase64, extensionId };
}

const fiverr = generateExtensionKey("fiverr");
const freelancer = generateExtensionKey("freelancer");

const out = {
  generatedAt: new Date().toISOString(),
  note:
    "Add key to each manifest.json. CORS_EXTENSION_IDS on Railway = comma-separated extensionId values.",
  extensions: {
    fiverr: {
      manifestKey: fiverr.keyBase64,
      extensionId: fiverr.extensionId,
      manifestPath: "apps/extension-fiverr/manifest.json",
    },
    freelancer: {
      manifestKey: freelancer.keyBase64,
      extensionId: freelancer.extensionId,
      manifestPath: "apps/extension-freelancer/manifest.json",
    },
  },
  railway: {
    CORS_EXTENSION_IDS: `${fiverr.extensionId},${freelancer.extensionId}`,
  },
};

console.log(JSON.stringify(out, null, 2));
