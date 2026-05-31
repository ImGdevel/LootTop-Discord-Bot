/**
 * Discord 슬래시 커맨드 등록 스크립트
 *
 * 사용법:
 *   DISCORD_APPLICATION_ID=xxx DISCORD_BOT_TOKEN=yyy npm run register
 *
 * - 명령어 추가/수정 시에만 수동 실행한다.
 * - Global Commands로 등록한다 (반영까지 최대 1시간 소요).
 * - 개발 환경 테스트 시에는 GUILD_ID를 지정해서 Guild Commands로 등록하면 즉시 반영된다.
 */

import { COMMAND_DEFINITIONS } from "../commands/definitions.js";

const APPLICATION_ID = process.env["DISCORD_APPLICATION_ID"];
const BOT_TOKEN = process.env["DISCORD_BOT_TOKEN"];
const GUILD_ID = process.env["GUILD_ID"]; // 개발 시 Guild Commands 등록용 (선택)

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error("DISCORD_APPLICATION_ID와 DISCORD_BOT_TOKEN 환경변수를 설정해주세요.");
  process.exit(1);
}

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
console.log(`✅ 커맨드 등록 완료 (${result.length}개)`);
result.forEach((cmd) => {
  const c = cmd as { name: string; id: string };
  console.log(`  - /${c.name} (id: ${c.id})`);
});
