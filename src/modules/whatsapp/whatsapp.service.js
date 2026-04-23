const pool = require("../../config/db");
const conversationRepo = require("../lead_conversations/leadConversations.repository");
const followupService = require("../followups/followup.service");
const aiSeller = require("../ai_seller/aiSeller.service");
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

async function handleIncomingMessage({ dealershipId, phone, text }) {
  try {
    if (!canProcess(dealershipId, phone)) return;

    let leadResult = await pool.query(
      `SELECT * FROM leads
       WHERE dealership_id = $1
       AND phone = $2`,
      [dealershipId, phone]
    );

    let lead = leadResult.rows[0];

    if (!lead) {
      const insert = await pool.query(
        `INSERT INTO leads
         (dealership_id, name, phone, status, source, ai_mode, created_at)
         VALUES ($1, 'Lead WhatsApp', $2, 'new', 'whatsapp', 'scheduled', NOW())
         RETURNING *`,
        [dealershipId, phone]
      );

      lead = insert.rows[0];
      await followupService.scheduleLeadFollowups(lead, "full");
    }

    await conversationRepo.saveMessage({
      dealershipId,
      leadId: lead.id,
      sender: "client",
      message: text
    });

    if (lead.ai_mode === "scheduled") {
      await pool.query(
        `UPDATE leads
         SET ai_mode = 'activating'
         WHERE id = $1 AND dealership_id = $2`,
        [lead.id, dealershipId]
      );

      await followupService.cancelLeadFollowups(lead.id);
    }

    const history = await conversationRepo.getRecentHistory(
      lead.id,
      dealershipId,
      15
    );

    const result = await aiSeller.handleMessage(lead.id, text, history);

    if (!result?.reply) return;

    await conversationRepo.saveMessage({
      dealershipId,
      leadId: lead.id,
      sender: "ai",
      message: result.reply
    });

    await pool.query(
      `UPDATE leads
       SET ai_mode = 'active'
       WHERE id = $1 AND dealership_id = $2`,
      [lead.id, dealershipId]
    );

    await sendMessage(dealershipId, phone, result.reply);
  } catch (err) {
    console.error("Erro no handleIncomingMessage:", err);
  }
}

module.exports = {
  handleIncomingMessage,
  sendMessage,
  canProcess
};
