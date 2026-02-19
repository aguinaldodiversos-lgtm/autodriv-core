const fs = require("fs").promises;
const path = require("path");

async function loadTemplate(templateName) {
  const filePath = path.join(__dirname, "templates", templateName);
  return await fs.readFile(filePath, "utf8");
}
