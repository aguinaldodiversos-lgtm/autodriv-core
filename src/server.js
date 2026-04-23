require("dotenv").config();

const logger = require("./config/logger");
const runMigrations = require("./database/migrate");
const app = require("./app");
const {
  startWhatsAppForConfiguredDealerships
} = require("./modules/whatsapp_baileys/whatsapp.bootstrap");
const PORT = process.env.PORT || 10000;

const skipWhatsApp =
  process.env.API_SKIP_WHATSAPP === "true" ||
  process.env.API_SKIP_WHATSAPP === "1";

async function start() {
  try {
    console.log("🧱 Rodando migrations...");
    await runMigrations();
    console.log("✅ Migrations concluídas");

    app.listen(PORT, async () => {
      console.log("=================================");
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log("=================================");

      if (skipWhatsApp) {
        logger.info("WhatsApp bootstrap ignorado (API_SKIP_WHATSAPP)");
        return;
      }
      try {
        console.log("📱 Iniciando conexão com WhatsApp...");
        await startWhatsAppForConfiguredDealerships();
      } catch (err) {
        console.error("❌ Erro ao iniciar WhatsApp:", err);
      }
    });
  } catch (err) {
    console.error("❌ Erro ao iniciar servidor:", err);
    process.exit(1);
  }
}

start();

/* =========================
   TRATAMENTO DE ERROS GLOBAIS
========================= */
process.on("unhandledRejection", (err) => {
  console.error("Erro não tratado (Promise):", err);
});

process.on("uncaughtException", (err) => {
  console.error("Exceção não capturada:", err);
});
