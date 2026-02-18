const pool = require("../../config/db");
const aiSeller = require("../ai_seller/aiSeller.service");
const followupService = require("../followups/followup.service");
const { getSession } = require("../whatsapp_baileys/session.manager");

/* =====================================================
   ENVIAR MENSAGEM VIA BAILEYS (MULTI-LOJA)
===================================================== */
async function sendMessage(dealershipId, phone, text) {
  try {
    const sock = getSession(dealershipId);

    if (!sock) {
      console.log(
        `⚠️ Sessão WhatsApp não iniciada para loja ${dealershipId}`
      );
      return;
    }

    const jid = phone.includes("@s.whatsapp.net")
      ? phone
      : `${phone}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text });

  } catch (err) {
    console.error("Erro ao enviar mensagem WhatsApp:", err);
  }
}

/* =====================================================
   PROCESSAR MENSAGEM RECEBIDA
===================================================== */
async function handleIncomingMessage({ dealershipId, phone, text }) {
  try {
    if (!phone || !text) return;

    /* =============================================
       BUSCA LEAD
    ============================================= */
    let leadResult = await pool.query(
      `SELECT * FROM leads
       WHERE dealership_id = $1
       AND phone = $2`,
      [dealershipId, phone]
    );

    let lead = leadResult.rows[0];

    /* =============================================
       SE NÃO EXISTE, CRIA
    ============================================= */
    if (!lead) {
      const insert = await pool.query(
        `INSERT INTO leads
         (dealership_id, name, phone, status, ai_mode, created_at)
         VALUES ($1, 'Lead WhatsApp', $2, 'new', 'scheduled', NOW())
         RETURNING *`,
        [dealershipId, phone]
      );

      lead = insert.rows[0];

      // Agenda follow-ups completos (Dia 0)
      await followupService.scheduleLeadFollowups(lead, "full");

      console.log(
        `📌 Novo lead criado via WhatsApp - Loja ${dealershipId}`
      );
    }

    /* =============================================
       CLIENTE RESPONDEU
       ATIVA IA E CANCELA FOLLOWUPS
    ============================================= */
    if (lead.ai_mode === "scheduled") {
      await pool.query(
        `UPDATE leads
         SET ai_mode = 'active'
         WHERE id = $1`,
        [lead.id]
      );

      await followupService.cancelLeadFollowups(lead.id);

      console.log(
        `🤖 IA ativada para lead ${lead.id}`
      );
    }

    /* =============================================
       CHAMA IA
    ============================================= */
    const result = await aiSeller.handleMessage(
      lead.id,
      text
    );

    /* =============================================
       ENVIA RESPOSTA
    ============================================= */
    await sendMessage(
      dealershipId,
      phone,
      result.reply
    );

  } catch (err) {
    console.error("Erro no handleIncomingMessage:", err);
  }
}

module.exports = {
  handleIncomingMessage,
  sendMessage
};
