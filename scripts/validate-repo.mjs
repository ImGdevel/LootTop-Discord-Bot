import { execFileSync } from "node:child_process";

function getStagedFiles() {
  const output = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { encoding: "utf8" }
  );

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, "/"));
}

function isForbidden(file) {
  const basename = file.split("/").at(-1) ?? file;

  if (basename === ".env.example") {
    return false;
  }

  if (basename === ".env" || basename === ".env.discord") {
    return true;
  }

  if (basename.startsWith(".env.")) {
    return true;
  }

  return false;
}

function getGitConfig(key) {
  try {
    return execFileSync("git", ["config", "--get", key], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function getGitVar(key) {
  try {
    return execFileSync("git", ["var", key], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const stagedFiles = getStagedFiles();
const forbiddenFiles = stagedFiles.filter(isForbidden);
const blockedContributorPatterns = ["codexdeus-lgtm", "codexdeus@gmail.com"];
const currentUserName = getGitConfig("user.name");
const currentUserEmail = getGitConfig("user.email");
const effectiveAuthor = getGitVar("GIT_AUTHOR_IDENT");
const effectiveCommitter = getGitVar("GIT_COMMITTER_IDENT");
const recentAuthors = execFileSync(
  "git",
  ["log", "--format=%an <%ae>", "-n", "20"],
  { encoding: "utf8" }
)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const contributorMatches = [
  currentUserName,
  currentUserEmail,
  effectiveAuthor,
  effectiveCommitter,
  ...recentAuthors,
].filter((value) => blockedContributorPatterns.some((pattern) => value.includes(pattern)));

if (forbiddenFiles.length > 0) {
  console.error("Forbidden files detected in staged changes:");
  for (const file of forbiddenFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

if (contributorMatches.length > 0) {
  console.error("Blocked contributor detected:");
  for (const value of contributorMatches) {
    console.error(`- ${value}`);
  }
  console.error("`codexdeus-lgtm` 계정 또는 `codexdeus@gmail.com` 식별자가 기여자 정보에 남아 있으면 커밋할 수 없다.");
  process.exit(1);
}

console.log("Repository validation passed.");
