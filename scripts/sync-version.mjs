/**
 * package.json의 version을 wrangler.jsonc vars.APP_VERSION에 동기화한다.
 * deploy/ship 스크립트에서 npm version 직후 실행된다.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const version = pkg.version;

const wranglerPath = resolve(root, "wrangler.jsonc");
const wrangler = readFileSync(wranglerPath, "utf-8");

// vars 블록의 APP_VERSION 교체 (없으면 추가)
let updated;
if (/"APP_VERSION"\s*:/.test(wrangler)) {
  updated = wrangler.replace(/"APP_VERSION"\s*:\s*"[^"]*"/, `"APP_VERSION": "${version}"`);
} else {
  updated = wrangler.replace(/"vars"\s*:\s*\{\s*\}/, `"vars": {\n    "APP_VERSION": "${version}"\n  }`);
}

writeFileSync(wranglerPath, updated, "utf-8");
console.log(`[sync-version] APP_VERSION → ${version}`);
