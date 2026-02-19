// src/modules/contracts/contract.generator.js

const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

async function generateContractPDF({
  htmlContent,
  outputPath
}) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"] // obrigatório no Render
  });

  const page = await browser.newPage();

  await page.setContent(htmlContent, {
    waitUntil: "networkidle0"
  });

  // 🔥 AQUI entra sua configuração
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

  return outputPath;
}

module.exports = {
  generateContractPDF
};
