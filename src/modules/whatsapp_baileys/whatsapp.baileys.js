const { startSession } = require("./session.manager");
const whatsappService = require("../whatsapp/whatsapp.service");

/* =====================================================
   INICIAR WHATSAPP POR LOJA
===================================================== */
async function startWhatsApp(dealershipId) {
  try {
    const sock = await startSession(dealershipId);

    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages[0];

        if (!msg?.message) return;
        if (msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid?.includes("@s.whatsapp.net")) return;

        const phone = remoteJid.replace("@s.whatsapp.net", "");

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          null;

        if (!text) return;

        await whatsappService.handleIncomingMessage({
          dealershipId,
          phone,
          text
        });

      } catch (err) {
        console.error("Erro ao processar mensagem:", err);
      }
    });

  } catch (err) {
    console.error("Erro ao iniciar WhatsApp:", err);
  }
}

module.exports = {
  startWhatsApp
};
