const pool = require("../config/db");
const conversationRepo = require("../modules/lead_conversations/leadConversations.repository");
const { getSession } = require("../modules/whatsapp_baileys/session.manager");

const DEFAULT_BATCH_SIZE = 50;
const LOCK_TIMEOUT_MINUTES = 10;
const DEFAULT_INTERVAL_MS = 60000;

function getBatchSize() {
  const parsed = parseInt(
    process.env.FOLLOWUP_BATCH_SIZE || String(DEFAULT_BATCH_SIZE),
    10
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BATCH_SIZE;
}

async function claimDueFollowups(limit) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      SELECT
        f.id,
        f.dealership_id,
        f.lead_id,
        f.message,
        f.scheduled_at,
        COALESCE(l.phone, l.client_phone) AS phone
      FROM lead_followups f
      JOIN leads l
        ON l.id = f.lead_id
       AND l.dealership_id = f.dealership_id
      WHERE f.sent_at IS NULL
        AND f.scheduled_at <= NOW()
        AND (
          f.locked_at IS NULL
          OR f.locked_at < NOW() - ($2::int * INTERVAL '1 minute')
        )
      ORDER BY f.scheduled_at ASC, f.id ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
      `,
      [limit, LOCK_TIMEOUT_MINUTES]
    );

    if (rows.length) {
      await client.query(
        `
        UPDATE lead_followups
        SET locked_at = NOW(),
            attempts = COALESCE(attempts, 0) + 1,
            updated_at = NOW()
        WHERE id = ANY($1::int[])
        `,
        [rows.map((row) => row.id)]
      );
    }

    await client.query("COMMIT");
    return rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function markSent(followupId) {
  await pool.query(
    `
    UPDATE lead_followups
    SET sent_at = NOW(),
        locked_at = NULL,
        last_error = NULL,
        updated_at = NOW()
    WHERE id = $1
    `,
    [followupId]
  );
}

async function markFailed(followupId, err) {
  await pool.query(
    `
    UPDATE lead_followups
    SET locked_at = NULL,
        last_error = $2,
        updated_at = NOW()
    WHERE id = $1
    `,
    [followupId, (err && err.message ? err.message : String(err)).slice(0, 500)]
  );
}

function toWhatsAppJid(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `${digits}@s.whatsapp.net` : null;
}

async function sendWhatsAppMessage(dealershipId, phone, message) {
  const sock = getSession(dealershipId);
  const jid = toWhatsAppJid(phone);

  if (!sock || !jid) return;

  await sock.sendMessage(jid, { text: message });
}

async function deliverFollowup(followup) {
  await conversationRepo.saveMessage({
    dealershipId: followup.dealership_id,
    leadId: followup.lead_id,
    sender: "ai",
    message: followup.message
  });

  if (followup.phone) {
    await sendWhatsAppMessage(
      followup.dealership_id,
      followup.phone,
      followup.message
    );
  }

  await markSent(followup.id);
}

async function runFollowUp() {
  const due = await claimDueFollowups(getBatchSize());
  let sent = 0;
  let failed = 0;

  for (const followup of due) {
    try {
      await deliverFollowup(followup);
      sent++;
    } catch (err) {
      failed++;
      await markFailed(followup.id, err);
      console.error(`[followup] Falha ao enviar ${followup.id}:`, err);
    }
  }

  console.log(`[followup] Processados=${due.length} enviados=${sent} falhas=${failed}`);

  return { processed: due.length, sent, failed };
}

function getIntervalMs() {
  const parsed = parseInt(
    process.env.FOLLOWUP_INTERVAL_MS || String(DEFAULT_INTERVAL_MS),
    10
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
}

async function startFollowupWorker() {
  const once = process.env.FOLLOWUP_RUN_ONCE === "true";

  await runFollowUp();
  if (once) return;

  const intervalMs = getIntervalMs();
  const timer = setInterval(() => {
    runFollowUp().catch((err) => {
      console.error(err);
    });
  }, intervalMs);

  const shutdown = () => {
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return new Promise(() => {});
}

module.exports = {
  runFollowUp,
  claimDueFollowups,
  deliverFollowup,
  startFollowupWorker
};

if (require.main === module) {
  require("dotenv").config();
  startFollowupWorker()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
