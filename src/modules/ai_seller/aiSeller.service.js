const pool = require("../../config/db");
const engine = require("./conversation.engine");

async function handleMessage(leadId, message) {
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1`,
    [leadId]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  // busca veículo
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

  // busca últimas mensagens
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

  const context = {
    vehicle
  };

  const reply = await engine.generateReply(context, messages);

  // salva resposta da IA
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,'ai',$3)`,
    [lead.dealership_id, leadId, reply]
  );

  return { reply };
}

module.exports = {
  handleMessage
};
