const db = require("../../config/db");

async function saveMessage({
  dealershipId,
  leadId,
  inboxThreadId,
  sender,
  channel,
  direction,
  externalMessageId,
  message,
  metadata
}) {
  await db.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, inbox_thread_id, role, channel, direction,
      external_message_id, message, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      dealershipId,
      leadId,
      inboxThreadId || null,
      sender,
      channel || null,
      direction || null,
      externalMessageId || null,
      message,
      JSON.stringify(metadata || {})
    ]
  );
}

async function getRecentHistory(leadId, dealershipId, limit = 15) {
  const { rows } = await db.query(
    `SELECT role, message
     FROM lead_conversations
     WHERE lead_id = $1
       AND dealership_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [leadId, dealershipId, limit]
  );

  return rows.reverse();
}

module.exports = {
  saveMessage,
  getRecentHistory
};
