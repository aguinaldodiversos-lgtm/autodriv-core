const pool = require("../../config/db");
const aiSeller = require("../ai_seller/aiSeller.service");
const followupService = require("../followups/followup.service");
const { getSession } = require("../whatsapp_baileys/session.manager");

/* =====================================================
   CONTROLE ANTI-FLOOD
===================================================== */

const messageCooldown = new Map();

function canProcess(dealershipId, phone) {
  const key = `${dealershipId}_${phone}`;

  if (messageCooldown.has(key)) return false;

  messageCooldown.set(key, true);

  setTimeout(() => {
    messageCooldown.delete(key);
  }, 2500); // 2.5s buffer

  return true;
}

/* =====================================================
   ENVIAR MENSAGEM
===================================================== */

async function sendMessage(dealershipId, phone, text) {
  try {
    const sock = getSession(dealershipId);
    if (!sock) return;

    const jid = `${phone}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text });

  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
  }
}

/* =====================================================
   PROCESSAR MENSAGEM RECEBIDA
===================================================== */

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

    /* =========================
       CRIA LEAD SE NÃO EXISTIR
    ========================== */

    if (!lead) {
      const insert = await pool.query(
        `INSERT INTO leads
         (dealership_id, name, phone, status, ai_mode, created_at)
         VALUES ($1, 'Lead WhatsApp', $2, 'new', 'scheduled', NOW())
         RETURNING *`,
        [dealershipId, phone]
      );

      lead = insert.rows[0];

      await followupService.scheduleLeadFollowups(lead, "full");
    }

    /* =========================
       ATIVA IA SE NECESSÁRIO
    ========================== */

    if (lead.ai_mode === "scheduled") {

      // trava temporária
      await pool.query(
        `UPDATE leads
         SET ai_mode = 'activating',
             updated_at = NOW()
         WHERE id = $1`,
        [lead.id]
      );

      await followupService.cancelLeadFollowups(lead.id);
    }

    /* =========================
       CHAMA IA
    ========================== */

    const result = await aiSeller.handleMessage(
      lead.id,
      text
    );

    if (!result?.reply) {
      console.log("IA não retornou resposta.");
      return;
    }

    /* =========================
       MARCA COMO ATIVO
    ========================== */

    if (lead.ai_mode !== "active") {
      await pool.query(
        `UPDATE leads
         SET ai_mode = 'active',
             updated_at = NOW()
         WHERE id = $1`,
        [lead.id]
      );
    }

    /* =========================
       ENVIA RESPOSTA
    ========================== */

    await sendMessage(
      dealershipId,
      phone,
      result.reply
    );

  } catch (err) {
    console.error("Erro handleIncomingMessage:", err);

    // rollback ativação se falhar IA
    await pool.query(
      `UPDATE leads
       SET ai_mode = 'scheduled'
       WHERE dealership_id = $1
       AND phone = $2`,
      [dealershipId, phone]
    );
  }
}

module.exports = {
  handleIncomingMessage,
  sendMessage
};
