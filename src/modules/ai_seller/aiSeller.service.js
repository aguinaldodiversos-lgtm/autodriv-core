const pool = require("../../config/db");
const engine = require("./conversation.engine");

/* =========================
   DETECÇÃO DE INTENÇÃO DE VISITA
========================= */
function detectVisitIntent(message) {
  const text = message.toLowerCase();

  const keywords = [
    "visitar",
    "ver o carro",
    "posso ir",
    "passar aí",
    "ir na loja",
    "agendar",
    "horário",
    "quando posso ir",
    "quero ver",
    "quero conhecer",
    "consigo ir",
    "posso passar"
  ];

  return keywords.some(k => text.includes(k));
}

async function handleMessage(leadId, message) {
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1`,
    [leadId]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  /* =========================
     BUSCA VEÍCULO
  ========================== */
  const vehicleResult = await pool.query(
    `SELECT
        v.*,
        s.seo_title,
        s.seo_description
     FROM vehicles v
     LEFT JOIN vehicle_seo s
       ON s.vehicle_id = v.id
     WHERE v.id = $1`,
    [lead.vehicle_id]
  );

  const vehicle = vehicleResult.rows[0];

  /* =========================
     BUSCA MANUTENÇÕES
  ========================== */
  const maintenanceResult = await pool.query(
    `SELECT t.title, t.status
     FROM maintenance_tasks t
     JOIN maintenance_orders o
       ON o.id = t.order_id
     WHERE o.vehicle_id = $1`,
    [lead.vehicle_id]
  );

  const maintenanceTasks = maintenanceResult.rows;

  /* =========================
     SALVA MENSAGEM DO CLIENTE
  ========================== */
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,'client',$3)`,
    [lead.dealership_id, leadId, message]
  );

  /* =========================
     ESTADO DA IA
  ========================== */
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

  /* =========================
     DETECTA INTENÇÃO DE VISITA
  ========================== */
  const wantsVisit = detectVisitIntent(message);

  if (wantsVisit) {
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + 1); // sugestão: amanhã

    await pool.query(
      `UPDATE lead_ai_state
       SET stage = 'visit_scheduled',
           visit_scheduled_at = $2,
           updated_at = NOW()
       WHERE lead_id = $1`,
      [leadId, visitDate]
    );

    const reply =
      "Perfeito! Vai ser um prazer te receber na loja. " +
      "Posso te atender amanhã. Qual período é melhor para você, manhã ou tarde?";

    await pool.query(
      `INSERT INTO lead_conversations
       (dealership_id, lead_id, role, message)
       VALUES ($1,$2,'ai',$3)`,
      [lead.dealership_id, leadId, reply]
    );

    return { reply, visit_scheduled: true };
  }

  /* =========================
     ÚLTIMAS MENSAGENS
  ========================== */
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

  /* =========================
     CONTEXTO DO VEÍCULO
  ========================== */
  const vehicleContext = {
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    year: vehicle?.year || "",
    price: vehicle?.price || "",
    mileage: vehicle?.mileage || "",
    fuel: vehicle?.fuel || "",
    transmission: vehicle?.transmission || "",
    color: vehicle?.color || "",
    description: vehicle?.description || "",
    seo_description: vehicle?.seo_description || "",
    documentation_status: vehicle?.documentation_status || "",
    maintenance: maintenanceTasks.length
      ? maintenanceTasks
          .map(t => `${t.title} (${t.status})`)
          .join(", ")
      : ""
  };

  /* =========================
     CHAMA IA
  ========================== */
  const reply = await engine.generateReply(
    {
      vehicle: vehicleContext,
      state
    },
    messages
  );

  /* =========================
     SALVA RESPOSTA DA IA
  ========================== */
  await pool.query(
    `INSERT INTO lead_conversations
     (dealership_id, lead_id, role, message)
     VALUES ($1,$2,'ai',$3)`,
    [lead.dealership_id, leadId, reply]
  );

  /* =========================
     ATUALIZA ESTÁGIO
  ========================== */
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
