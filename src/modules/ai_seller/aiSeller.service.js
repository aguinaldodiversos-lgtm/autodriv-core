const pool = require("../../config/db");
const engine = require("./conversation.engine");

/* =========================
   BUSCAR OU CRIAR ESTADO
========================= */
async function getOrCreateState(lead) {
  let result = await pool.query(
    `SELECT * FROM lead_ai_state WHERE lead_id = $1`,
    [lead.id]
  );

  let state = result.rows[0];

  if (!state) {
    const insert = await pool.query(
      `INSERT INTO lead_ai_state
       (dealership_id, lead_id, stage)
       VALUES ($1,$2,'new')
       RETURNING *`,
      [lead.dealership_id, lead.id]
    );

    state = insert.rows[0];
  }

  return state;
}

/* =========================
   ATUALIZA ESTÁGIO
========================= */
async function updateStage(leadId, stage) {
  await pool.query(
    `UPDATE lead_ai_state
     SET stage = $1,
         updated_at = NOW()
     WHERE lead_id = $2`,
    [stage, leadId]
  );
}

/* =========================
   SALVAR MENSAGEM
========================= */
async function saveMessage(dealershipId, leadId, role, message) {
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,$3,$4)`,
    [dealershipId, leadId, role, message]
  );
}

/* =========================
   BUSCAR HISTÓRICO
========================= */
async function getConversationHistory(leadId) {
  const result = await pool.query(
    `SELECT role, message
     FROM lead_conversations
     WHERE lead_id = $1
     ORDER BY id DESC
     LIMIT 8`,
    [leadId]
  );

  return result.rows
    .reverse()
    .map(m => ({
      role: m.role === "client" ? "user" : "assistant",
      content: m.message
    }));
}

/* =========================
   DETECTAR ESTÁGIO PELO TEXTO
========================= */
function detectStage(message, state) {
  const text = message.toLowerCase();

  if (state.stage === "new") {
    return "responded";
  }

  // intenção financeira
  if (
    text.includes("financ") ||
    text.includes("entrada") ||
    text.includes("parcela") ||
    text.includes("troca")
  ) {
    return "qualifying";
  }

  // intenção de visita
  if (
    text.includes("posso ir") ||
    text.includes("vou passar") ||
    text.includes("quando posso") ||
    text.includes("horário")
  ) {
    return "ready_for_visit";
  }

  return state.stage;
}

/* =========================
   FUNÇÃO PRINCIPAL
========================= */
async function handleMessage(leadId, message) {
  /* =========================
     BUSCA LEAD
  ========================== */
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1`,
    [leadId]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  /* =========================
     BUSCA VEÍCULO
  ========================== */
  let vehicle = null;

  if (lead.vehicle_id) {
    const vehicleResult = await pool.query(
      `SELECT * FROM vehicles WHERE id = $1`,
      [lead.vehicle_id]
    );

    vehicle = vehicleResult.rows[0];
  }

  /* =========================
     SALVA MENSAGEM CLIENTE
  ========================== */
  await saveMessage(lead.dealership_id, lead.id, "client", message);

  /* =========================
     ESTADO DA IA
  ========================== */
  let state = await getOrCreateState(lead);

  /* =========================
     ATUALIZA ESTÁGIO
  ========================== */
  const newStage = detectStage(message, state);
  if (newStage !== state.stage) {
    await updateStage(lead.id, newStage);
    state.stage = newStage;
  }

  /* =========================
     HISTÓRICO
  ========================== */
  const messages = await getConversationHistory(lead.id);

  /* =========================
     CONTEXTO DO VEÍCULO
  ========================== */
  const vehicleContext = vehicle
    ? {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        mileage: vehicle.mileage,
        fuel: vehicle.fuel,
        transmission: vehicle.transmission,
        color: vehicle.color,
        description: vehicle.description
      }
    : {};

  /* =========================
     GERA RESPOSTA DA IA
  ========================== */
  const reply = await engine.generateReply(
    {
      lead,
      state,
      vehicle: vehicleContext
    },
    messages
  );

  /* =========================
     SALVA RESPOSTA IA
  ========================== */
  await saveMessage(lead.dealership_id, lead.id, "ai", reply);

  return { reply };
}

module.exports = {
  handleMessage
};
