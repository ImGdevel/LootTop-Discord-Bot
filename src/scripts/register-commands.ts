import { COMMAND_DEFINITIONS } from "../commands/definitions.js";

const APPLICATION_ID = process.env["DISCORD_APPLICATION_ID"];
const BOT_TOKEN = process.env["DISCORD_BOT_TOKEN"];
const GUILD_ID = process.env["GUILD_ID"];

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error("DISCORD_APPLICATION_ID와 DISCORD_BOT_TOKEN 환경변수를 설정해주세요.");
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
