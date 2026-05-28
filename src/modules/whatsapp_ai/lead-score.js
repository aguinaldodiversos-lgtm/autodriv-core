const { INTENTS, normalizeText } = require("./intent-classifier");

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreLead({ message, classification, previousUnknownCount = 0 }) {
  const text = normalizeText(message);
  const reasons = [];
  let score = 0;

  if (classification.entities.vehicle) {
    score += 30;
    reasons.push("veiculo_especifico:+30");
  }
  if (/\b(preco|valor|menor valor|desconto|quanto custa|qual valor)\b/.test(text)) {
    score += 25;
    reasons.push("pergunta_preco:+25");
  }
  if (/\b(visitar|ver o carro|ir na loja|hoje|agora|test drive)\b/.test(text)) {
    score += 25;
    reasons.push("quer_visitar:+25");
  }
  if (classification.intent === INTENTS.FINANCING) {
    score += 25;
    reasons.push("financiamento:+25");
  }
  if (/\b(entrada|dou de entrada|tenho.*entrada)\b/.test(text)) {
    score += 20;
    reasons.push("entrada_informada:+20");
  }
  if (classification.intent === INTENTS.TRADE_IN || classification.entities.trade_vehicle) {
    score += 20;
    reasons.push("troca:+20");
  }
  if (classification.intent === INTENTS.APPRAISAL) {
    score += 20;
    reasons.push("avaliacao:+20");
  }
  if (String(message || "").trim().length >= 25) {
    score += 15;
    reasons.push("resposta_qualificacao:+15");
  }
  if (classification.entities.location || classification.entities.preferred_time) {
    score += 10;
    reasons.push("localizacao_ou_horario:+10");
  }
  if (classification.confidence < 0.65) {
    score -= 20;
    reasons.push("baixa_confianca:-20");
  }
  if (classification.intent === INTENTS.UNKNOWN && previousUnknownCount > 0) {
    score -= 30;
    reasons.push("indefinida_persistente:-30");
  }
  if (/\b(parar|cancelar|nao quero|não quero|remover|sair)\b/.test(text)) {
    score -= 50;
    reasons.push("opt_out:-50");
  }

  const finalScore = clamp(score);
  const label =
    finalScore >= 80 ? "muito_quente" :
      finalScore >= 60 ? "quente" :
        finalScore >= 30 ? "morno" : "frio";

  return {
    score: finalScore,
    label,
    reasons
  };
}

function priorityForScore(score) {
  if (score >= 85) return "urgent";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

module.exports = {
  scoreLead,
  priorityForScore,
  clamp
};
