import { readFileSync } from "fs";
import { resolve } from "path";
import { COMMAND_DEFINITIONS } from "../commands/definitions.js";

// .env.discord 파일 자동 로드 (process.env 우선)
function loadEnvFile(): void {
  const candidates = [
    resolve(process.cwd(), ".env.discord"),
    resolve(process.cwd(), ".env"),
  ];
  for (const filePath of candidates) {
    try {
      const content = readFileSync(filePath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key && !(key in process.env)) {
          process.env[key] = value;
        }
      }
      console.log(`[env] ${filePath} 로드 완료`);
      return;
    } catch {
      // 파일 없으면 무시
    }
  }
}

loadEnvFile();

const APPLICATION_ID = process.env["DISCORD_APPLICATION_ID"];
const BOT_TOKEN = process.env["DISCORD_BOT_TOKEN"];
const GUILD_ID = process.env["DISCORD_GUILD_ID"] ?? process.env["GUILD_ID"];

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error("DISCORD_APPLICATION_ID와 DISCORD_BOT_TOKEN이 필요합니다.");
  console.error(".env.discord 파일을 확인해 주세요.");
  process.exit(1);
}

async function main() {
  const url = GUILD_ID
    ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

  console.log(`커맨드 등록 대상: ${GUILD_ID ? `길드(${GUILD_ID})` : "글로벌"}`);
  console.log(`등록할 커맨드 수: ${COMMAND_DEFINITIONS.length}`);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${BOT_TOKEN}`,
    },
    body: JSON.stringify(COMMAND_DEFINITIONS),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("커맨드 등록 실패:", res.status, error);
    process.exit(1);
  }

  const result = await res.json() as unknown[];
  console.log(`커맨드 등록 완료 (${result.length}개)`);
  result.forEach((cmd) => {
    const c = cmd as { name: string; id: string };
    console.log(`  - /${c.name} (id: ${c.id})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
