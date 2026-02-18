require("dotenv").config();

const app = require("./app");
const { startWhatsApp } = require("./modules/whatsapp_baileys/whatsapp.baileys");

const PORT = process.env.PORT || 10000;

/* =========================
   INICIAR SERVIDOR
========================= */
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

/* =========================
   TRATAMENTO DE ERROS GLOBAIS
========================= */
process.on("unhandledRejection", (err) => {
  console.error("Erro não tratado (Promise):", err);
});

process.on("uncaughtException", (err) => {
  console.error("Exceção não capturada:", err);
});
