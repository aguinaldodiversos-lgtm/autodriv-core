const whatsappAi = require("../whatsapp_ai/whatsappAi.service");
const { getSession } = require("../whatsapp_baileys/session.manager");

function canProcess(dealershipId, phone) {
  const id = Number(dealershipId);
  if (!Number.isFinite(id) || id < 1) return false;
  if (phone == null || String(phone).trim().length < 8) return false;
  return true;
}

function toWhatsAppJid(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits.length) return null;
  return `${digits}@s.whatsapp.net`;
}

async function sendMessage(dealershipId, phone, text) {
  const sock = getSession(dealershipId);
  if (!sock) {
    console.warn(
      `[whatsapp] Sem sessão Baileys para dealership_id=${dealershipId}; resposta não enviada.`
    );
    return;
  }
  const jid = toWhatsAppJid(phone);
  if (!jid) return;
  await sock.sendMessage(jid, { text });
}

async function handleIncomingMessage({
  dealershipId,
  phone,
  text,
  providerMessageId,
  rawPayload,
  messageType,
  customerName,
  sendMessage: sendMessageOverride
}) {
  try {
    if (!canProcess(dealershipId, phone)) return;

    return await whatsappAi.processInboundMessage({
      dealershipId,
      phone,
      text,
      providerMessageId,
      rawPayload,
      messageType,
      customerName,
      sendMessage: sendMessageOverride || ((reply) => sendMessage(dealershipId, phone, reply))
    });
  } catch (err) {
    console.error("Erro no handleIncomingMessage:", err);
  }
}

module.exports = {
  handleIncomingMessage,
  sendMessage,
  canProcess
};
