const aiSeller = require("../ai_seller/aiSeller.service");
const followupService = require("../followups/followup.service");
const pool = require("../../config/db");

// Vamos receber o socket do Baileys dinamicamente
let sockInstance = null;

/* =========================================
   REGISTRAR SOCKET (chamado pelo baileys)
========================================= */
function registerSocket(sock) {
  sockInstance = sock;
}

/* =========================================
   ENVIAR MENSAGEM VIA BAILEYS
========================================= */
async function sendMessage(phone, text) {
  if (!sockInstance) {
    console.log("⚠️ WhatsApp ainda não conectado");
    return;
  }

  try {
    const jid = phone.includes("@s.whatsapp.net")
      ? phone
      : `${phone}@s.whatsapp.net`;

    await sockInstance.sendMessage(jid, { text });
  } catch (err) {
    console.error("Erro ao enviar mensagem WhatsApp:", err);
  }
}

/* =========================================
   PROCESSAR MENSAGEM RECEBIDA
========================================= */
async function handleIncomingMessage(messageData) {
  try {
    const phone = messageData.phone;
    const text = messageData.text;

    if (!phone || !text) return;

    /* =========================
       BUSCA LEAD
    ========================== */
    let leadResult = await pool.query(
      `SELECT * FROM leads WHERE phone = $1`,
      [phone]
    );

    let lead = leadResult.rows[0];

    /* =========================
       SE NÃO EXISTE, CRIA
    ========================== */
    if (!lead) {
      const insert = await pool.query(
        `INSERT INTO leads
         (dealership_id, name, phone, status, ai_mode, created_at)
         VALUES (1, 'Lead WhatsApp', $1, 'new', 'scheduled', NOW())
         RETURNING *`,
        [phone]
      );

      lead = insert.rows[0];

      // Agenda follow-ups automáticos completos
      await followupService.scheduleLeadFollowups(lead, "full");
    }

    /* =========================
       CLIENTE RESPONDEU
       ATIVA IA
    ========================== */
    if (lead.ai_mode === "scheduled") {
      await pool.query(
        `UPDATE leads
         SET ai_mode = 'active'
         WHERE id = $1`,
        [lead.id]
      );

      await followupService.cancelLeadFollowups(lead.id);
    }

    /* =========================
       CHAMA IA
    ========================== */
    const result = await aiSeller.handleMessage(lead.id, text);

    /* =========================
       ENVIA RESPOSTA
    ========================== */
    await sendMessage(phone, result.reply);

  } catch (err) {
    console.error("Erro no handleIncomingMessage:", err);
  }
}

module.exports = {
  registerSocket,
  handleIncomingMessage,
  sendMessage
};
