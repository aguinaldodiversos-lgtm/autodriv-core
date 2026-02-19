const fs = require("fs");
const path = require("path");

function loadTemplate(templateName) {
  const filePath = path.join(
    __dirname,
    "templates",
    templateName
  );

  return fs.readFileSync(filePath, "utf8");
}
