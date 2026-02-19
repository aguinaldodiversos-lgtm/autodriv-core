const pool = require("../../config/db");
const { addToQueue } = require("./queue/aiQueue.service");
const { generateReply } = require("./engine/openai.engine");
const { calculateLeadScore } = require("./scoring/scoring.service");
const { detectVisitScheduling } = require("./scheduling/scheduling.service");
const { captureFinancialSignals } = require("./qualification/qualification.service");

async function handleMessage(leadId, message) {
  if (!leadId || !message) {
    throw new Error("leadId e message são obrigatórios");
  }

  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1`,
    [leadId]
  );

  if (!leadResult.rows.length) {
    throw new Error("Lead não encontrado");
  }

  const lead = leadResult.rows[0];

  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,'client',$3)`,
    [lead.dealership_id, leadId, message]
  );

  await captureFinancialSignals(message, leadId);

  const history = await pool.query(
    `SELECT role, message
     FROM lead_conversations
     WHERE lead_id = $1
     ORDER BY id DESC
     LIMIT 10`,
    [leadId]
  );

  const messages = history.rows.reverse().map((m) => ({
    role: m.role === "client" ? "user" : "assistant",
    content: m.message
  }));

  const reply = await addToQueue(() =>
    generateReply({ lead }, messages)
  );

  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,'ai',$3)`,
    [lead.dealership_id, leadId, reply]
  );

  await detectVisitScheduling(reply, leadId);
  await calculateLeadScore(leadId);

  return { reply };
}

module.exports = {
  handleMessage
};
