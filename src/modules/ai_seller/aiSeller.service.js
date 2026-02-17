const pool = require("../../config/db");
const engine = require("./conversation.engine");

async function handleMessage(leadId, message) {
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1`,
    [leadId]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  const vehicleResult = await pool.query(
    `SELECT * FROM vehicles WHERE id = $1`,
    [lead.vehicle_id]
  );

  const vehicle = vehicleResult.rows[0];

  // salva mensagem do cliente
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,'client',$3)`,
    [lead.dealership_id, leadId, message]
  );

  // pega estado da IA
  let stateResult = await pool.query(
    `SELECT * FROM lead_ai_state WHERE lead_id = $1`,
    [leadId]
  );

  let state = stateResult.rows[0];

  if (!state) {
    const insert = await pool.query(
      `INSERT INTO lead_ai_state
       (dealership_id, lead_id, stage)
       VALUES ($1,$2,'new')
       RETURNING *`,
      [lead.dealership_id, leadId]
    );
    state = insert.rows[0];
  }

  // pega últimas mensagens
  const convo = await pool.query(
    `SELECT role, message
     FROM lead_conversations
     WHERE lead_id = $1
     ORDER BY id DESC
     LIMIT 6`,
    [leadId]
  );

  const messages = convo.rows
    .reverse()
    .map(m => ({
      role: m.role === "client" ? "user" : "assistant",
      content: m.message
    }));

  // chama IA
  const reply = await engine.generateReply(
    { vehicle, state },
    messages
  );

  // salva resposta da IA
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,'ai',$3)`,
    [lead.dealership_id, leadId, reply]
  );

  // atualiza estágio simples
  await pool.query(
    `UPDATE lead_ai_state
     SET stage = 'qualifying',
         updated_at = NOW()
     WHERE lead_id = $1`,
    [leadId]
  );

  return { reply };
}

module.exports = {
  handleMessage
};
