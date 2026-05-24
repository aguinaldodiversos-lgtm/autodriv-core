require("dotenv").config();

const {
  startWhatsAppForConfiguredDealerships
} = require("../modules/whatsapp_baileys/whatsapp.bootstrap");

async function start() {
  try {
    await startWhatsAppForConfiguredDealerships();
    console.log("[whatsapp] Worker iniciado");
  } catch (err) {
    console.error("[whatsapp] Falha ao iniciar worker:", err);
    process.exit(1);
  }
}

start();

process.on("unhandledRejection", (err) => {
  console.error("[whatsapp] Promise sem tratamento:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[whatsapp] Excecao nao capturada:", err);
  process.exit(1);
});
