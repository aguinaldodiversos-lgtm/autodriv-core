require("dotenv").config();

// Fail-fast: segredos obrigatórios precisam existir antes de qualquer outra coisa
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    "❌ JWT_SECRET inválido: defina JWT_SECRET com no mínimo 32 caracteres."
  );
  process.exit(1);
}

const runMigrations = require("./database/migrate");
const app = require("./app");
const { startWhatsApp } = require("./modules/whatsapp_baileys/whatsapp.baileys");
const PORT = process.env.PORT || 10000;

async function start() {
  try {
    console.log("🧱 Rodando migrations...");
    await runMigrations();
    console.log("✅ Migrations concluídas");

    app.listen(PORT, async () => {
      console.log("=================================");
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log("=================================");

      try {
        console.log("📱 Iniciando conexão com WhatsApp...");
        await startWhatsApp();
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
