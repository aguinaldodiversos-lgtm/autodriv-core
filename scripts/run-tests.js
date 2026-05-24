const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const testDir = path.join(root, "test");

const files = fs
  .readdirSync(testDir)
  .filter((file) => file.endsWith(".test.js"))
  .sort();

for (const file of files) {
  require(path.join(testDir, file));
}
