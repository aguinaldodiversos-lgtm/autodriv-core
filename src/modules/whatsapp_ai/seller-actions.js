const { INTENTS } = require("./intent-classifier");
const { priorityForScore } = require("./lead-score");

function actionFor({ classification, score }) {
  let type = "follow_up";
  let title = "Continuar atendimento do lead do WhatsApp";

  if (classification.intent === INTENTS.BUY_INTENT && classification.entities.vehicle) {
    type = "confirm_vehicle_availability";
    title = "Confirmar disponibilidade do veiculo para lead do WhatsApp";
  } else if (classification.intent === INTENTS.FINANCING) {
    type = "simulate_financing";
    title = "Preparar simulacao de financiamento";
  } else if (classification.intent === INTENTS.TRADE_IN) {
    type = "evaluate_trade_in";
    title = "Avaliar veiculo usado na troca";
  } else if (classification.intent === INTENTS.APPRAISAL) {
    type = "appraise_vehicle";
    title = "Avaliar veiculo do cliente";
  } else if (classification.intent === INTENTS.GENERAL_QUESTION) {
    type = "answer_question";
    title = "Responder duvida do lead";
  } else if (classification.intent === INTENTS.SUPPORT_OR_POST_SALE) {
    type = "handle_complaint";
    title = "Assumir atendimento de suporte/pos-venda";
  }

  return {
    type,
    title,
    priority: priorityForScore(score),
    description: classification.reason
  };
}

module.exports = {
  actionFor
};
