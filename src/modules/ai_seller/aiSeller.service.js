const pool = require("../../config/db");
const engine = require("./conversation.engine");
const convoRepo = require("../lead_conversations/leadConversations.repository");
const stateRepo = require("../lead_ai_state/leadAiState.repository");

/* =========================
   DETECÇÃO DE QUALIFICAÇÃO
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

  // se já tem forma de pagamento definida
  if (currentState.payment_type) {
    return "ready_for_visit";
  }

  return "qualifying";
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

  let updatedPaymentType = state.payment_type;
  let updatedTradeIn = state.has_trade_in;

  if (paymentType) {
    updatedPaymentType = paymentType;
  }

  if (tradeIn !== null) {
    updatedTradeIn = tradeIn;
  }

  /* =========================
     ATUALIZA ESTADO FINANCEIRO
  ========================== */
  await pool.query(
    `UPDATE lead_ai_state
     SET payment_type = COALESCE($2, payment_type),
         has_trade_in = COALESCE($3, has_trade_in),
         updated_at = NOW()
     WHERE lead_id = $1`,
    [leadId, updatedPaymentType, updatedTradeIn]
  );

  /* =========================
     ATUALIZA STAGE
  ========================== */
  const newStage = detectStage(message, {
    payment_type: updatedPaymentType
  });

  await stateRepo.updateStage(leadId, newStage);

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
