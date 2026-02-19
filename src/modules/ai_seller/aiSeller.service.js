const pool = require("../../config/db");
const engine = require("./conversation.engine");

/* =====================================================
   HANDLE MESSAGE
===================================================== */

async function handleMessage(leadId, message) {
  if (!leadId || !message) {
    throw new Error("leadId e message são obrigatórios");
  }

  /* =====================================================
     BUSCA LEAD
  ===================================================== */
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1 LIMIT 1`,
    [leadId]
  );

  if (!leadResult.rows.length) {
    throw new Error("Lead não encontrado");
  }

  const lead = leadResult.rows[0];

  /* =====================================================
     BUSCA VEÍCULO (SE EXISTIR)
  ===================================================== */
  let vehicle = null;

  if (lead.vehicle_id) {
    const vehicleResult = await pool.query(
      `SELECT v.*, s.seo_description
       FROM vehicles v
       LEFT JOIN vehicle_seo s
         ON s.vehicle_id = v.id
       WHERE v.id = $1
       LIMIT 1`,
      [lead.vehicle_id]
    );

    vehicle = vehicleResult.rows[0] || null;
  }

  /* =====================================================
     BUSCA OU CRIA ESTADO DA IA
  ===================================================== */
  let stateResult = await pool.query(
    `SELECT * FROM lead_ai_state
     WHERE lead_id = $1
     LIMIT 1`,
    [leadId]
  );

  let state;

  if (!stateResult.rows.length) {
    const insert = await pool.query(
      `INSERT INTO lead_ai_state
       (dealership_id, lead_id, stage)
       VALUES ($1, $2, 'new')
       RETURNING *`,
      [lead.dealership_id, leadId]
    );

    state = insert.rows[0];
  } else {
    state = stateResult.rows[0];
  }

  /* =====================================================
     SALVA MENSAGEM DO CLIENTE
  ===================================================== */
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message, created_at)
     VALUES ($1, $2, 'client', $3, NOW())`,
    [lead.dealership_id, leadId, message]
  );

  /* =====================================================
     BUSCA HISTÓRICO RECENTE
  ===================================================== */
  const convoResult = await pool.query(
    `SELECT role, message
     FROM lead_conversations
     WHERE lead_id = $1
     ORDER BY id DESC
     LIMIT 10`,
    [leadId]
  );

  const messages = convoResult.rows
    .reverse()
    .map((m) => ({
      role: m.role === "client" ? "user" : "assistant",
      content: m.message
    }));

  /* =====================================================
     MONTA CONTEXTO DO VEÍCULO
  ===================================================== */
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
        description: vehicle.description,
        seo_description: vehicle.seo_description,
        documentation_status: vehicle.documentation_status
      }
    : null;

  /* =====================================================
     CHAMA MOTOR DE IA
  ===================================================== */
  const reply = await engine.generateReply(
    {
      vehicle: vehicleContext,
      state,
      lead
    },
    messages
  );

  if (!reply) {
    throw new Error("Erro ao gerar resposta da IA");
  }

  /* =====================================================
     SALVA RESPOSTA DA IA
  ===================================================== */
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message, created_at)
     VALUES ($1, $2, 'ai', $3, NOW())`,
    [lead.dealership_id, leadId, reply]
  );

  /* =====================================================
     ATUALIZA ESTÁGIO INTELIGENTE
  ===================================================== */

  let newStage = state.stage;

  if (state.stage === "new") {
    newStage = "responded";
  }

  if (
    reply.toLowerCase().includes("passar") ||
    reply.toLowerCase().includes("visitar") ||
    reply.toLowerCase().includes("agendar")
  ) {
    newStage = "ready_for_visit";
  }

  await pool.query(
    `UPDATE lead_ai_state
     SET stage = $2,
         updated_at = NOW()
     WHERE lead_id = $1`,
    [leadId, newStage]
  );

  return { reply };
}

module.exports = {
  handleMessage
};
