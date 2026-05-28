const pool = require("../../config/db");
const whatsappService = require("../whatsapp/whatsapp.service");

function normalizePhone(jid) {
  return String(jid || "").replace("@s.whatsapp.net", "");
}

async function sendMessage(sock, jid, text) {
  if (!text) return;
  await sock.sendMessage(jid, { text });
}

async function resolveDealershipId(phone) {
  const configured = Number(process.env.WHATSAPP_DEALERSHIP_ID || 0);
  if (Number.isFinite(configured) && configured > 0) return configured;

  const { rows } = await pool.query(
    `SELECT dealership_id
     FROM whatsapp_instances
     WHERE phone_number = $1
     LIMIT 1`,
    [phone]
  );
  return rows[0]?.dealership_id || null;
}

async function handleIncomingMessage(sock, jid, text, options = {}) {
  const phone = normalizePhone(jid);
  const dealershipId = await resolveDealershipId(phone);
  if (!dealershipId) {
    console.warn("[whatsapp] Mensagem recebida sem loja vinculada");
    return;
  }

  await whatsappService.handleIncomingMessage({
    dealershipId,
    phone,
    text,
    providerMessageId: options.providerMessageId || null,
    messageType: options.messageType || "text",
    rawPayload: { legacy_handler: true, ...(options.rawPayload || {}) },
    customerName: options.customerName || null,
    sendMessage: (reply) => sendMessage(sock, jid, reply)
  });
}

module.exports = {
  handleIncomingMessage
};
