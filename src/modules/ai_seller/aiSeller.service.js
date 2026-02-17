const pool = require("../../config/db");
const engine = require("./conversation.engine");
const convoRepo = require("../lead_conversations/leadConversations.repository");
const stateRepo = require("../lead_ai_state/leadAiState.repository");

// detectors
const detectPaymentType = require("./detectors/payment.detector");
const detectTradeIn = require("./detectors/tradeIn.detector");
const detectName = require("./detectors/name.detector");
const detectUsage = require("./detectors/usage.detector");
const detectBudget = require("./detectors/budget.detector");
const detectTimeline = require("./detectors/timeline.detector");

// services
const calculateLeadScore = require("./services/leadScoring.service");
const { createHotLeadTask } = require("./services/taskAutomation.service");

/* =========================
   STAGE DETECTION
========================= */

function detectStage(message, currentState) {
  const msg = message.toLowerCase();

  if (
    msg.includes("vou") ||
    msg.includes("confirm") ||
    msg.includes("combinado") ||
    msg.includes("estarei")
  ) {
    return "visit_scheduled";
  }

  if (
    msg.includes("posso ir") ||
    msg.includes("amanhã") ||
    msg.includes("hoje") ||
    msg.includes("ver o carro") ||
    msg.includes("passar aí")
  ) {
    return "ready_for_visit";
  }

  if (
    currentState.payment_type &&
    currentState.has_trade_in !== null
  ) {
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

  await convoRepo.addMessage({
    dealership_id: lead.dealership_id,
    lead_id: leadId,
    role: "client",
    message
  });

  let state = await stateRepo.getState(leadId);

  if (!state) {
    state = await stateRepo.createState({
      dealership_id: lead.dealership_id,
      lead_id: leadId,
      stage: "new"
    });
  }

  // detectores
  const paymentType = detectPaymentType(message);
  const tradeIn = detectTradeIn(message);
  const clientName = detectName(message);
  const usageProfile = detectUsage(message);
  const budget = detectBudget(message);
  const timeline = detectTimeline(message);

  let updatedPaymentType = state.payment_type;
  let updatedTradeIn = state.has_trade_in;

  if (paymentType) updatedPaymentType = paymentType;
  if (tradeIn !== null) updatedTradeIn = tradeIn;

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

  const newStage = detectStage(message, {
    payment_type: updatedPaymentType,
    has_trade_in: updatedTradeIn
  });

  await stateRepo.updateStage(leadId, newStage);

  const updatedStateResult = await pool.query(
    `SELECT * FROM lead_ai_state WHERE lead_id = $1`,
    [leadId]
  );

  const updatedState = updatedStateResult.rows[0];

  const leadScore = calculateLeadScore(updatedState);

  await pool.query(
    `UPDATE lead_ai_state
     SET lead_score = $2,
         updated_at = NOW()
     WHERE lead_id = $1`,
    [leadId, leadScore]
  );

  if (leadScore === "hot") {
    await createHotLeadTask(leadId, lead.dealership_id);
  }

  const messagesRaw = await convoRepo.getRecentMessages(leadId, 6);

  const messages = messagesRaw.map(m => ({
    role: m.role === "client" ? "user" : "assistant",
    content: m.message
  }));

  const reply = await engine.generateReply({}, messages);

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
