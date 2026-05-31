/**
 * Worker Secret 등록 스크립트
 * 사용법: npx wrangler login && node scripts/register-secrets.mjs
 *
 * Windows PowerShell에서 echo 파이프 방식은 따옴표가 포함될 수 있으므로
 * stdin을 직접 작성하는 방식을 사용한다.
 */
import { readFileSync } from "fs";
import { execFileSync } from "child_process";
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

console.log("Worker secret 등록을 시작합니다...\n");

for (const key of secrets) {
  const value = env[key];
  if (!value) { console.warn(`⚠️  ${key} 없음`); continue; }

  try {
    execFileSync("npx", ["wrangler", "secret", "put", key], {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
      cwd: resolve(__dirname, ".."),
      shell: false,
    });
    console.log(`✅ ${key} 등록 완료`);
  } catch {
    console.error(`❌ ${key} 등록 실패`);
    process.exit(1);
  }
}

console.log("\n모든 secret 등록이 완료되었습니다.");
