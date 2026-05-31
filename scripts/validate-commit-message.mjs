import { readFileSync } from "node:fs";

const messagePath = process.argv[2];

if (!messagePath) {
  console.error("커밋 메시지 파일 경로가 필요합니다.");
  process.exit(1);
}

const message = readFileSync(messagePath, "utf8").trim();
const [subject = "", ...bodyLines] = message.split(/\r?\n/);
const body = bodyLines.join("\n");

const allowedTypes = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "test",
  "chore",
  "build",
  "ci",
  "perf",
  "hotfix",
];

const gitmojiByType = new Map([
  ["feat", "✨"],
  ["fix", "🐛"],
  ["docs", "📝"],
  ["style", "💄"],
  ["refactor", "♻️"],
  ["test", "✅"],
  ["chore", "🔧"],
  ["build", "📦"],
  ["ci", "👷"],
  ["perf", "⚡"],
  ["hotfix", "🚑"],
]);

if (/^(Merge|Revert|fixup!|squash!)/.test(subject)) {
  process.exit(0);
}

const gitmoji = [...gitmojiByType.values()].find((emoji) => subject.startsWith(`${emoji} `));
const subjectWithoutGitmoji = gitmoji ? subject.slice(gitmoji.length + 1) : subject;
const subjectPattern = new RegExp(`^(${allowedTypes.join("|")})(\\([a-z0-9-]+\\))?: (.+)$`);
const subjectMatch = subjectWithoutGitmoji.match(subjectPattern);

const errors = [];

if (!gitmoji) {
  errors.push("제목은 gitmoji와 공백으로 시작해야 한다.");
}

if (!subjectMatch) {
  errors.push("제목은 <gitmoji> <type>(optional-scope): <한국어 요약> 형식이어야 한다.");
}

if (subjectMatch) {
  const [, type, , description] = subjectMatch;
  const expectedGitmoji = gitmojiByType.get(type);

  if (gitmoji !== expectedGitmoji) {
    errors.push(`${type} 타입의 gitmoji는 ${expectedGitmoji} 이어야 한다.`);
  }

  if (/(한다|했다|된다|되다|합니다|했습니다|하였다)$/.test(description.trim())) {
    errors.push(
      "제목 요약은 서술형이 아니라 한국어 명사형이어야 한다. 예: 🔧 chore(repo): 허스키 검증 규칙 추가"
    );
  }
}

if (!/[가-힣]/.test(subject)) {
  errors.push("커밋 메시지 제목은 한국어를 포함해야 한다.");
}

if (/(Generated with|Co-authored-by:|Co-committed-by:|Claude|Codex)/i.test(message)) {
  errors.push("AI attribution 또는 공동 작성 footer를 남기지 않는다.");
}

if (errors.length > 0) {
  console.error("Invalid commit message:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Commit message validation passed.");
