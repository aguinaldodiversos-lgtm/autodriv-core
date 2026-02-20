const conversationRepo = require("../lead_conversations/leadConversations.repository");

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
         (dealership_id, name, phone, status, ai_mode, created_at)
         VALUES ($1, 'Lead WhatsApp', $2, 'new', 'scheduled', NOW())
         RETURNING *`,
        [dealershipId, phone]
      );

      lead = insert.rows[0];
      await followupService.scheduleLeadFollowups(lead, "full");
    }

    /* =========================
       SALVA MENSAGEM DO CLIENTE
    ========================== */

    await conversationRepo.saveMessage({
      dealershipId,
      leadId: lead.id,
      sender: "client",
      message: text
    });

    /* =========================
       ATIVA IA SE NECESSÁRIO
    ========================== */

    if (lead.ai_mode === "scheduled") {
      await pool.query(
        `UPDATE leads
         SET ai_mode = 'activating'
         WHERE id = $1`,
        [lead.id]
      );

      await followupService.cancelLeadFollowups(lead.id);
    }

    /* =========================
       BUSCA HISTÓRICO
    ========================== */

    const history = await conversationRepo.getRecentHistory(lead.id, 15);

    /* =========================
       CHAMA IA COM CONTEXTO
    ========================== */

    const result = await aiSeller.handleMessage(
      lead.id,
      text,
      history
    );

    if (!result?.reply) return;

    /* =========================
       SALVA RESPOSTA DA IA
    ========================== */

    await conversationRepo.saveMessage({
      dealershipId,
      leadId: lead.id,
      sender: "ai",
      message: result.reply
    });

    await pool.query(
      `UPDATE leads
       SET ai_mode = 'active'
       WHERE id = $1`,
      [lead.id]
    );

    await sendMessage(
      dealershipId,
      phone,
      result.reply
    );

  } catch (err) {
    console.error("Erro no handleIncomingMessage:", err);
  }
}
