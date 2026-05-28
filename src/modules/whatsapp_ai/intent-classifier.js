const INTENTS = Object.freeze({
  BUY_INTENT: "BUY_INTENT",
  TRADE_IN: "TRADE_IN",
  FINANCING: "FINANCING",
  APPRAISAL: "APPRAISAL",
  GENERAL_QUESTION: "GENERAL_QUESTION",
  SUPPORT_OR_POST_SALE: "SUPPORT_OR_POST_SALE",
  UNKNOWN: "UNKNOWN"
});

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function extractVehicle(text) {
  const raw = String(text || "").trim();
  const modelMatch = raw.match(
    /\b(?:civic|corolla|onix|hb20|hilux|s10|ranger|compass|renegade|creta|toro|kwid|argo|mobi|gol|polo|jetta|hr-v|hrv|tracker|byd|song|dolphin|seal|yuan)\b(?:\s+[\w./-]+){0,4}/i
  );
  return modelMatch ? modelMatch[0].trim() : null;
}

function extractYear(text) {
  const match = String(text || "").match(/\b(19[8-9]\d|20[0-3]\d)\b/);
  return match ? match[1] : null;
}

function extractBudget(text) {
  const match = String(text || "").match(
    /\b(?:r\$\s*)?(\d{2,3}(?:[.\s]\d{3})+|\d{4,6})(?:,\d{2})?\b/i
  );
  return match ? match[0].trim() : null;
}

function classifyIntent(message, context = {}) {
  const normalized = normalizeText(message);
  const entities = {
    vehicle: extractVehicle(message),
    brand: null,
    model: null,
    year: extractYear(message),
    budget: extractBudget(message),
    trade_vehicle: null,
    financing_interest: false,
    preferred_time: null,
    location: null
  };

  if (!normalized || normalized.length < 2 || /^[\W_]+$/.test(normalized)) {
    return {
      intent: INTENTS.UNKNOWN,
      confidence: 0.25,
      reason: "Mensagem curta ou sem texto util",
      entities,
      urgency: "low",
      shouldEscalate: false
    };
  }

  const asksHuman = matchAny(normalized, [
    /\b(vendedor|atendente|humano|consultor|me liga|ligacao|telefone)\b/,
    /\bfalar com alguem\b/
  ]);
  const support = matchAny(normalized, [
    /\b(problema|reclamar|reclamacao|defeito|documentacao|documento atrasado|pos venda|garantia|processo|advogado)\b/,
    /\b(comprei|ja comprei|meu carro deu)\b/
  ]);
  const financing = matchAny(normalized, [
    /\b(financia|financiamento|entrada|parcela|parcelas|simular|simulacao|score|credito|banco|aprov[a-z]+)\b/
  ]);
  const tradeIn = matchAny(normalized, [
    /\b(aceita troca|pega troca|pega meu carro|meu carro na troca|na troca|como entrada|volta quanto|trocar)\b/
  ]);
  const appraisal = matchAny(normalized, [
    /\b(quero vender|compram meu carro|avalia|avaliacao|quanto pagam|vender meu carro|meu carro esta abaixo da fipe)\b/
  ]);
  const buy = matchAny(normalized, [
    /\b(interesse|disponivel|ainda tem|menor valor|qual valor|preco|ver o carro|visitar|test drive|negociar|fechar|comprar|proposta)\b/,
    /\b(tem esse|quero esse|gostei desse)\b/
  ]);
  const general = matchAny(normalized, [
    /\b(endereco|localizacao|horario|abrem|entrega|garantia|como funciona|onde fica|loja)\b/
  ]);

  if (tradeIn || appraisal) {
    const tradeMatch = String(message || "").match(
      /(?:tenho|meu|minha)\s+(.{3,80})/i
    );
    entities.trade_vehicle = tradeMatch ? tradeMatch[1].trim() : null;
  }
  entities.financing_interest = financing;
  entities.preferred_time = matchAny(normalized, [/\b(hoje|amanha|sabado|domingo|agora|a tarde|de manha)\b/])
    ? String(message).match(/\b(hoje|amanh[aã]|s[aá]bado|domingo|agora|a tarde|de manh[aã])\b/i)?.[0] || null
    : null;
  entities.location = matchAny(normalized, [/\b(endereco|localizacao|onde fica|ir na loja)\b/])
    ? "asked_store_location"
    : null;

  let intent = INTENTS.UNKNOWN;
  let confidence = 0.55;
  let reason = "Intencao indefinida";

  if (support) {
    intent = INTENTS.SUPPORT_OR_POST_SALE;
    confidence = 0.88;
    reason = "Mensagem indica suporte, reclamacao ou pos-venda";
  } else if (financing) {
    intent = INTENTS.FINANCING;
    confidence = 0.86;
    reason = "Cliente perguntou sobre financiamento, entrada ou parcelas";
  } else if (tradeIn) {
    intent = INTENTS.TRADE_IN;
    confidence = 0.86;
    reason = "Cliente mencionou troca ou carro como entrada";
  } else if (appraisal) {
    intent = INTENTS.APPRAISAL;
    confidence = 0.84;
    reason = "Cliente quer vender ou avaliar veiculo";
  } else if (buy) {
    intent = INTENTS.BUY_INTENT;
    confidence = entities.vehicle ? 0.88 : 0.78;
    reason = entities.vehicle
      ? "Cliente demonstrou compra com veiculo identificado"
      : "Cliente demonstrou interesse comercial";
  } else if (general) {
    intent = INTENTS.GENERAL_QUESTION;
    confidence = 0.72;
    reason = "Cliente fez duvida operacional geral";
  }

  const hotSignals = [
    asksHuman,
    support,
    /\b(visitar|ver o carro|ir na loja|hoje|agora|fechar|proposta|menor valor|me liga|ligacao)\b/.test(normalized),
    financing && /\b(entrada|simular|parcela|score)\b/.test(normalized),
    tradeIn && Boolean(entities.trade_vehicle)
  ];

  const urgency = hotSignals.some(Boolean)
    ? "high"
    : intent === INTENTS.UNKNOWN
      ? "low"
      : "medium";

  return {
    intent,
    confidence,
    reason,
    entities,
    urgency,
    shouldEscalate:
      asksHuman ||
      support ||
      confidence < Number(context.lowConfidenceThreshold || 0.65) ||
      hotSignals.some(Boolean)
  };
}

module.exports = {
  INTENTS,
  classifyIntent,
  normalizeText
};
