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

async function upsertWhatsAppThread(dealershipId, lead, phone) {
  const externalThreadId = `whatsapp:${String(phone).replace(/\D/g, "")}`;
  const result = await pool.query(
    `INSERT INTO inbox_threads
      (dealership_id, lead_id, channel, external_thread_id, subject,
       status, assigned_user_id, sla_due_at, last_message_at, unread_count, metadata)
     VALUES ($1,$2,'whatsapp',$3,$4,'open',$5,NOW() + INTERVAL '1 hour',NOW(),1,$6::jsonb)
     ON CONFLICT (dealership_id, channel, external_thread_id)
     WHERE external_thread_id IS NOT NULL
     DO UPDATE SET
       lead_id = EXCLUDED.lead_id,
       status = 'open',
       last_message_at = NOW(),
       unread_count = inbox_threads.unread_count + 1,
       updated_at = NOW()
     RETURNING *`,
    [
      dealershipId,
      lead.id,
      externalThreadId,
      lead.name || lead.client_name || "Lead WhatsApp",
      lead.assigned_user_id || null,
      JSON.stringify({ phone })
    ]
  );
  return result.rows[0];
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

    const thread = await upsertWhatsAppThread(dealershipId, lead, phone);

    await conversationRepo.saveMessage({
      dealershipId,
      leadId: lead.id,
      inboxThreadId: thread.id,
      sender: "client",
      channel: "whatsapp",
      direction: "inbound",
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

    const result = await aiSeller.handleMessage(lead.id, text, history, {
      dealershipId
    });

    if (!result?.reply) return;

    await conversationRepo.saveMessage({
      dealershipId,
      leadId: lead.id,
      inboxThreadId: thread.id,
      sender: "ai",
      channel: "whatsapp",
      direction: "outbound",
      message: result.reply
    });

    await pool.query(
      `UPDATE inbox_threads
       SET status = 'waiting_customer',
           last_message_at = NOW(),
           unread_count = 0,
           updated_at = NOW()
       WHERE id = $1 AND dealership_id = $2`,
      [thread.id, dealershipId]
    );

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
