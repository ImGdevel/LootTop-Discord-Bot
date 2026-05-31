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

const stagedFiles = getStagedFiles();
const forbiddenFiles = stagedFiles.filter(isForbidden);

if (forbiddenFiles.length > 0) {
  console.error("Forbidden files detected in staged changes:");
  for (const file of forbiddenFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("Repository validation passed.");
