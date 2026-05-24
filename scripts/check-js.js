const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const targets = ["src", "scripts", "test"];
const ignoredDirs = new Set([
  ".git",
  ".claude",
  "node_modules",
  "coverage",
  "dist",
  "build",
  ".next"
]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = targets.flatMap((target) => walk(path.join(root, target)));
const failures = [];

for (const file of files) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8").replace(/^#!.*\n/, "");

  try {
    new vm.Script(source, { filename: rel });
  } catch (err) {
    failures.push(`${rel}: ${err.message}`);
  }
}

if (failures.length) {
  console.error("JS syntax check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`JS syntax check passed (${files.length} files).`);
