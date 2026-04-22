// src/modules/contracts/contract.generator.js

// Lazy-require puppeteer: evita que o boot-path carregue o Chromium (~280MB)
// e quebre o deploy no Render quando o pacote não estiver instalado.
// Só é resolvido quando generatePDF() é efetivamente chamado.
let puppeteer;
function getPuppeteer() {
  if (!puppeteer) puppeteer = require("puppeteer");
  return puppeteer;
}

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

async function loadTemplate(templateName) {
  const filePath = path.join(__dirname, "templates", templateName);
  return fs.readFile(filePath, "utf8");
}

function sanitize(value) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function replacePlaceholders(template, data) {
  let html = template;

  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    html = html.replace(regex, sanitize(data[key]));
  });

  return html;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function generatePDF({ templateName, data, outputPath }) {
  const template = await loadTemplate(templateName);
  const html = replacePlaceholders(template, data);

  await ensureDir(path.dirname(outputPath));

  const browser = await getPuppeteer().launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm"
    }
  });

  await browser.close();

  const buffer = await fs.readFile(outputPath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  return { hash };
}

module.exports = {
  generatePDF
};
