const { startSession } = require("./session.manager");
const whatsappService = require("../whatsapp/whatsapp.service");

const activeListeners = new Set();

async function startWhatsApp(dealershipId) {
  const id = Number(dealershipId);
  if (!Number.isFinite(id) || id < 1) {
    throw new Error(
      `startWhatsApp: dealershipId inválido (${dealershipId}). Defina WHATSAPP_DEALERSHIP_IDS no servidor.`
    );
  }

  const sock = await startSession(id);

  if (activeListeners.has(id)) {
    return sock;
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages?.[0];
      if (!msg?.message) return;
      if (msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid?.includes("@s.whatsapp.net")) return;

      const phone = remoteJid.replace("@s.whatsapp.net", "");

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        null;

      if (!text) return;

      const messageType =
        msg.message.conversation || msg.message.extendedTextMessage
          ? "text"
          : msg.message.imageMessage
            ? "image"
            : "unknown";

      await whatsappService.handleIncomingMessage({
        dealershipId: id,
        phone,
        text,
        providerMessageId: msg.key.id || null,
        messageType,
        rawPayload: {
          key: msg.key,
          messageTimestamp: msg.messageTimestamp,
          pushName: msg.pushName || null
        },
        customerName: msg.pushName || null
      });

    } catch (err) {
      console.error("Erro no listener:", err);
    }
  });

  activeListeners.add(id);

  return sock;
}

module.exports = {
  startWhatsApp
};
