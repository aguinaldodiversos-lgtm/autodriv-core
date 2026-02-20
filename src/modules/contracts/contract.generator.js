// src/modules/contracts/contract.generator.js

const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

async function loadTemplate(templateName) {
  const filePath = path.join(__dirname, "templates", templateName);
  return await fs.readFile(filePath, "utf8");
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

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    console.error("Erro ao criar diretório:", err);
    throw err;
  }
}

async function generatePDF({ templateName, data, outputPath }) {
  const template = await loadTemplate(templateName);
  const htmlContent = replacePlaceholders(template, data);

  await ensureDirectoryExists(path.dirname(outputPath));

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setContent(htmlContent, {
    waitUntil: "networkidle0"
  });

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

  // Gerar hash de integridade
  const fileBuffer = await fs.readFile(outputPath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  return { outputPath, hash };
}

module.exports = {
  generatePDF
};
