const pool = require("../../config/db");
const engine = require("./conversation.engine");
const convoRepo = require("../lead_conversations/leadConversations.repository");
const stateRepo = require("../lead_ai_state/leadAiState.repository");

/* =========================
   DETECÇÕES BÁSICAS
========================= */

function detectPaymentType(message) {
  const msg = message.toLowerCase();

  if (
    msg.includes("à vista") ||
    msg.includes("avista") ||
    msg.includes("dinheiro")
  ) {
    return "cash";
  }

  if (
    msg.includes("financ") ||
    msg.includes("parcel") ||
    msg.includes("entrada")
  ) {
    return "finance";
  }

  return null;
}

function detectTradeIn(message) {
  const msg = message.toLowerCase();

  if (
    msg.includes("troca") ||
    msg.includes("meu carro") ||
    msg.includes("dar o meu")
  ) {
    return true;
  }

  return null;
}

function detectName(message) {
  const match = message.match(/meu nome é ([a-zA-ZÀ-ÿ]+)/i);
  if (match) return match[1];
  return null;
}

function detectUsage(message) {
  const msg = message.toLowerCase();

  if (msg.includes("trabalho") || msg.includes("dia a dia")) {
    return "daily_use";
  }

  if (msg.includes("família") || msg.includes("familia")) {
    return "family";
  }

  if (msg.includes("viagem") || msg.includes("estrada")) {
    return "travel";
  }

  return null;
}

function detectBudget(message) {
  const match = message.match(/(\d{3,5})/);
  if (match) return match[1];
  return null;
}

function detectTimeline(message) {
  const msg = message.toLowerCase();

  if (msg.includes("esse mês") || msg.includes("esse mes")) {
    return "this_month";
  }

  if (msg.includes("ano que vem")) {
    return "next_year";
  }

  if (msg.includes("semana") || msg.includes("logo")) {
    return "soon";
  }

  return null;
}

function detectStage(message, currentState) {
  const msg = message.toLowerCase();

  // cliente confirmou visita
  if (
    msg.includes("vou") ||
    msg.includes("confirm") ||
    msg.includes("combinado") ||
    msg.includes("estarei")
  ) {
    return "visit_scheduled";
  }

  // cliente demonstrou intenção de visita
  if (
    msg.includes("posso ir") ||
    msg.includes("amanhã") ||
    msg.includes("hoje") ||
    msg.includes("ver o carro") ||
    msg.includes("passar aí")
  ) {
    return "ready_for_visit";
  }

  // pronto para visita somente se já tiver pagamento e troca
  if (
    currentState.payment_type &&
    currentState.has_trade_in !== null
  ) {
    return "ready_for_visit";
  }

  return "qualifying";
}

function calculateLeadScore(state) {
  // HOT
  if (
    state.stage === "visit_scheduled" ||
    (state.payment_type && state.budget_range)
  ) {
    return "hot";
  }

  // WARM
  if (
    state.stage === "qualifying" ||
    state.payment_type
  ) {
    return "warm";
  }

  // COLD
  return "cold";
}

/* =========================
   TAREFA AUTOMÁTICA PARA LEAD HOT
========================= */

async function createHotLeadTask(leadId, dealershipId) {
  // verifica se já existe tarefa pendente
  const existing = await pool.query(
    `SELECT id FROM tasks
     WHERE lead_id = $1
     AND status = 'pending'
     LIMIT 1`,
    [leadId]
  );

  if (existing.rows.length > 0) {
    return;
  }

  // cria tarefa
  await pool.query(
    `INSERT INTO tasks
     (dealership_id, lead_id, title, type, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())`,
    [
      dealershipId,
      leadId,
      "Lead quente: entrar em contato",
      "hot_lead"
    ]
  );
}

/* =========================
   SERVICE PRINCIPAL
========================= */

async function handleMessage(leadId, message) {
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1`,
    [leadId]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  /* =========================
     SALVA MENSAGEM DO CLIENTE
  ========================== */
  await convoRepo.addMessage({
    dealership_id: lead.dealership_id,
    lead_id: leadId,
    role: "client",
    message
  });

  /* =========================
     BUSCA OU CRIA ESTADO
  ========================== */
  let state = await stateRepo.getState(leadId);

  if (!state) {
    state = await stateRepo.createState({
      dealership_id: lead.dealership_id,
      lead_id: leadId,
      stage: "new"
    });
  }

  /* =========================
     DETECÇÃO DE QUALIFICAÇÃO
  ========================== */
  const paymentType = detectPaymentType(message);
  const tradeIn = detectTradeIn(message);
  const clientName = detectName(message);
  const usageProfile = detectUsage(message);
  const budget = detectBudget(message);
  const timeline = detectTimeline(message);

  let updatedPaymentType = state.payment_type;
  let updatedTradeIn = state.has_trade_in;

  if (paymentType) {
    updatedPaymentType = paymentType;
  }

  if (tradeIn !== null) {
    updatedTradeIn = tradeIn;
  }

  /* =========================
     ATUALIZA ESTADO NO BANCO
  ========================== */
  await pool.query(
    `UPDATE lead_ai_state
     SET payment_type = COALESCE($2, payment_type),
         has_trade_in = COALESCE($3, has_trade_in),
         client_name = COALESCE($4, client_name),
         usage_profile = COALESCE($5, usage_profile),
         budget_range = COALESCE($6, budget_range),
         purchase_timeline = COALESCE($7, purchase_timeline),
         updated_at = NOW()
     WHERE lead_id = $1`,
    [
      leadId,
      updatedPaymentType,
      updatedTradeIn,
      clientName,
      usageProfile,
      budget,
      timeline
    ]
  );

  /* =========================
     ATUALIZA STAGE
  ========================== */
  const newStage = detectStage(message, {
    payment_type: updatedPaymentType,
    has_trade_in: updatedTradeIn
  });

  await stateRepo.updateStage(leadId, newStage);

  /* =========================
     BUSCA ESTADO ATUALIZADO
  ========================== */
  const updatedStateResult = await pool.query(
    `SELECT * FROM lead_ai_state WHERE lead_id = $1`,
    [leadId]
  );

  const updatedState = updatedStateResult.rows[0];

  /* =========================
     ATUALIZA LEAD SCORE
  ========================== */
  const leadScore = calculateLeadScore(updatedState);

  await pool.query(
    `UPDATE lead_ai_state
     SET lead_score = $2,
         updated_at = NOW()
     WHERE lead_id = $1`,
    [leadId, leadScore]
  );

  /* =========================
     CRIA TAREFA PARA LEAD HOT
  ========================== */
  if (leadScore === "hot") {
    await createHotLeadTask(leadId, lead.dealership_id);
  }

  /* =========================
     BUSCA HISTÓRICO
  ========================== */
  const messagesRaw = await convoRepo.getRecentMessages(leadId, 6);

  const messages = messagesRaw.map(m => ({
    role: m.role === "client" ? "user" : "assistant",
    content: m.message
  }));

  /* =========================
     GERA RESPOSTA DA IA
  ========================== */
  const reply = await engine.generateReply({}, messages);

  /* =========================
     SALVA RESPOSTA DA IA
  ========================== */
  await convoRepo.addMessage({
    dealership_id: lead.dealership_id,
    lead_id: leadId,
    role: "ai",
    message: reply
  });

  return { reply };
}

module.exports = {
  handleMessage
};
