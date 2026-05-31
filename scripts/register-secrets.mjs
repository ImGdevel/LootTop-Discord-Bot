/**
 * Worker Secret 등록 스크립트
 * 사용법: npx wrangler login && node scripts/register-secrets.mjs
 */
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.discord");

const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim()]; })
);

const secrets = ["DISCORD_PUBLIC_KEY", "DISCORD_APPLICATION_ID", "DISCORD_BOT_TOKEN"];

for (const key of secrets) {
  const value = env[key];
  if (!value) { console.warn(`⚠️  ${key} 없음`); continue; }
  try {
    execSync(`echo "${value}" | npx wrangler secret put ${key}`, {
      stdio: ["pipe", "inherit", "inherit"],
      cwd: resolve(__dirname, ".."),
    });
    console.log(`✅ ${key} 등록 완료`);
  } catch {
    console.error(`❌ ${key} 등록 실패`); process.exit(1);
  }
}
