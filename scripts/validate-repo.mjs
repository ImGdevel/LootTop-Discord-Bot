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

function parseGitIdentity(identity) {
  const match = identity.match(/^(.*?) <(.*?)>(?: \d+ [+-]\d{4})?$/);

  if (!match) {
    return { name: "", email: "" };
  }

  return { name: match[1], email: match[2] };
}

const stagedFiles = getStagedFiles();
const forbiddenFiles = stagedFiles.filter(isForbidden);
const currentUserName = getGitConfig("user.name");
const currentUserEmail = getGitConfig("user.email");
const effectiveAuthor = getGitVar("GIT_AUTHOR_IDENT");
const effectiveCommitter = getGitVar("GIT_COMMITTER_IDENT");
const parsedAuthor = parseGitIdentity(effectiveAuthor);
const parsedCommitter = parseGitIdentity(effectiveCommitter);
const identityErrors = [];

if (!currentUserName) {
  identityErrors.push("git user.name이 설정되어 있어야 한다.");
}

if (!currentUserEmail) {
  identityErrors.push("git user.email이 설정되어 있어야 한다.");
}

if (parsedAuthor.name !== currentUserName || parsedAuthor.email !== currentUserEmail) {
  identityErrors.push("GIT_AUTHOR_IDENT는 현재 git user.name / user.email과 같아야 한다.");
}

if (parsedCommitter.name !== currentUserName || parsedCommitter.email !== currentUserEmail) {
  identityErrors.push("GIT_COMMITTER_IDENT는 현재 git user.name / user.email과 같아야 한다.");
}

if (forbiddenFiles.length > 0) {
  console.error("Forbidden files detected in staged changes:");
  for (const file of forbiddenFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

if (identityErrors.length > 0) {
  console.error("Git identity mismatch:");
  for (const error of identityErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Repository validation passed.");
