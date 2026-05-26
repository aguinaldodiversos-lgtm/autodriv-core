const OpenAI = require("openai");
const pool = require("../../config/db");
const aiSettings = require("../ai_settings/aiSettings.service");

const MODEL = process.env.OPENAI_LEAD_RECEPTION_MODEL || "gpt-4o-mini";
const MAX_RESPONSE_TOKENS = 220;

let openai = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatCurrency(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(numeric);
}

function detectIntent(message) {
  const text = normalize(message);
  const intents = new Set();

  if (/(preco|valor|quanto|custa|tabela|fipe)/.test(text)) intents.add("price");
  if (/(financia|financiamento|entrada|parcela|parcelas|credito|banco)/.test(text)) intents.add("financing");
  if (/(troca|trocar|pega.*carro|meu carro|usado na troca)/.test(text)) intents.add("trade_in");
  if (/(visita|ver o carro|conhecer|test drive|teste|passar ai|ir na loja|endereco|localizacao)/.test(text)) intents.add("visit");
  if (/(disponivel|ainda tem|tem esse|vendeu)/.test(text)) intents.add("availability");
  if (/(foto|video|imagem|interior|porta malas|motor)/.test(text)) intents.add("media");
  if (/(documento|manual|chave|garantia|revisao|procedencia)/.test(text)) intents.add("documentation");
  if (/(urgente|hoje|amanha|essa semana|comprar agora|fechar)/.test(text)) intents.add("hot_timing");

  return Array.from(intents);
}

function detectName(message) {
  const match = String(message || "").match(/(?:meu nome e|me chamo|sou o|sou a)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/i);
  return match ? match[1].trim() : null;
}

function detectPaymentType(intents, message) {
  const text = normalize(message);
  if (/(a vista|avista|pix|dinheiro)/.test(text)) return "cash";
  if (intents.includes("financing")) return "financing";
  return null;
}

function detectPurchaseTimeline(message) {
  const text = normalize(message);
  if (/(hoje|agora|ainda hoje)/.test(text)) return "today";
  if (/(amanha)/.test(text)) return "tomorrow";
  if (/(essa semana|fim de semana|sabado|domingo)/.test(text)) return "this_week";
  if (/(mes que vem|proximo mes)/.test(text)) return "next_month";
  return null;
}

function scoreLead({ intents, hasVehicle, message }) {
  let score = 25;
  if (hasVehicle) score += 10;
  if (intents.includes("availability")) score += 8;
  if (intents.includes("price")) score += 8;
  if (intents.includes("financing")) score += 15;
  if (intents.includes("trade_in")) score += 14;
  if (intents.includes("visit")) score += 22;
  if (intents.includes("hot_timing")) score += 18;
  if (String(message || "").length >= 80) score += 5;
  return clamp(score, 0, 100);
}

function scoreLabel(score) {
  if (score >= 75) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

function stageForAnalysis(intents, score) {
  if (intents.includes("visit") && score >= 70) return "ready_for_visit";
  if (intents.includes("financing") || intents.includes("trade_in")) return "qualifying";
  if (score >= 75) return "handoff_to_human";
  return "responded";
}

async function getLeadContext(leadId, dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       l.*,
       d.name AS dealership_name,
       d.phone AS dealership_phone,
       v.title AS vehicle_title,
       v.brand AS vehicle_brand,
       v.model AS vehicle_model,
       v.version AS vehicle_version,
       v.year AS vehicle_year,
       v.price AS vehicle_price,
       v.fipe_price AS vehicle_fipe_price,
       v.mileage AS vehicle_mileage,
       v.fuel AS vehicle_fuel,
       v.transmission AS vehicle_transmission,
       v.color AS vehicle_color,
       COUNT(vi.id)::int AS vehicle_image_count
     FROM leads l
     LEFT JOIN dealerships d ON d.id = l.dealership_id
     LEFT JOIN vehicles v ON v.id = l.vehicle_id AND v.dealership_id = l.dealership_id
     LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id
     WHERE l.id = $1
       AND l.dealership_id = $2
     GROUP BY l.id, d.id, v.id`,
    [leadId, dealershipId]
  );

  if (!rows[0]) throw httpError("Lead nao encontrado", 404);
  return rows[0];
}

function buildFallbackReply(context, analysis) {
  const name = context.name || context.client_name;
  const greeting = name && !/^lead/i.test(name) ? `${name}, ` : "";
  const vehicle = context.vehicle_title ||
    [context.vehicle_brand, context.vehicle_model, context.vehicle_version, context.vehicle_year].filter(Boolean).join(" ");
  const price = formatCurrency(context.vehicle_price);

  if (analysis.intents.includes("price")) {
    if (vehicle && price) {
      return `${greeting}esse ${vehicle} esta anunciado por ${price}. Posso te ajudar a simular entrada, parcela ou avaliar troca?`;
    }
    return `${greeting}consigo te ajudar com valores e condicoes. Voce pretende financiar, pagar a vista ou colocar carro na troca?`;
  }

  if (analysis.intents.includes("financing")) {
    return `${greeting}da para analisar financiamento sim. Voce teria uma entrada em mente e quer simular em quantas vezes?`;
  }

  if (analysis.intents.includes("trade_in")) {
    return `${greeting}a gente avalia troca sim. Me fala modelo, ano, km e estado geral do seu carro para eu te orientar melhor.`;
  }

  if (analysis.intents.includes("visit")) {
    return `${greeting}perfeito. Posso pedir para um consultor reservar um horario para voce ver o veiculo. Fica melhor hoje ou amanha?`;
  }

  if (vehicle) {
    return `${greeting}tenho as informacoes desse ${vehicle}. Voce quer saber sobre preco, financiamento, troca ou agendar uma visita?`;
  }

  return `${greeting}me conta qual veiculo voce procura e se pretende financiar, pagar a vista ou colocar carro na troca.`;
}

function buildSystemPrompt(context, analysis) {
  const vehicle = context.vehicle_title ||
    [context.vehicle_brand, context.vehicle_model, context.vehicle_version, context.vehicle_year].filter(Boolean).join(" ");
  const price = formatCurrency(context.vehicle_price);

  return `
Voce e um pre-atendente de WhatsApp para uma loja de veiculos usados.

Objetivo:
- responder rapido;
- qualificar o lead;
- descobrir intencao de compra;
- conduzir para vendedor humano quando houver sinal forte;
- registrar proximos passos sem inventar informacoes.

Regras obrigatorias:
- Responda em portugues do Brasil.
- Use no maximo 3 frases curtas.
- Nao diga que e IA.
- Nao prometa desconto, aprovacao de credito, reserva ou condicao final.
- Pode informar preco anunciado se ele estiver no contexto.
- Se faltar dado, faca uma pergunta objetiva.
- Se o lead estiver quente, diga que vai chamar um consultor.

Contexto da loja:
- Loja: ${context.dealership_name || "AutoDriv"}

Contexto do lead:
- Nome: ${context.name || context.client_name || "nao informado"}
- Telefone: ${context.phone || context.client_phone || "nao informado"}
- Intencoes detectadas: ${analysis.intents.join(", ") || "nao definida"}
- Prioridade: ${analysis.score}/100 (${analysis.score_label})

Contexto do veiculo:
- Veiculo: ${vehicle || "nao vinculado"}
- Preco anunciado: ${price || "nao informado"}
- FIPE: ${formatCurrency(context.vehicle_fipe_price) || "nao informada"}
- KM: ${context.vehicle_mileage || "nao informado"}
- Combustivel: ${context.vehicle_fuel || "nao informado"}
- Cambio: ${context.vehicle_transmission || "nao informado"}
- Cor: ${context.vehicle_color || "nao informada"}
- Fotos cadastradas: ${context.vehicle_image_count || 0}
`.trim();
}

async function generateAiReply(context, message, history, analysis) {
  const client = getOpenAIClient();
  if (!client) return null;

  const messages = [
    { role: "system", content: buildSystemPrompt(context, analysis) },
    ...history.slice(-8).map((item) => ({
      role: item.role === "client" ? "user" : "assistant",
      content: item.message
    })),
    { role: "user", content: message }
  ];

  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.45,
    max_tokens: MAX_RESPONSE_TOKENS
  });

  return response.choices?.[0]?.message?.content?.trim() || null;
}

async function updateLeadState(leadId, dealershipId, message, analysis) {
  const detectedName = detectName(message);
  const paymentType = detectPaymentType(analysis.intents, message);
  const timeline = detectPurchaseTimeline(message);
  const hasTradeIn = analysis.intents.includes("trade_in") ? true : null;

  await pool.query(
    `INSERT INTO lead_ai_state
      (dealership_id, lead_id, stage, payment_type, has_trade_in,
       client_name, purchase_timeline, lead_score, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (lead_id)
     DO UPDATE SET
       stage = EXCLUDED.stage,
       payment_type = COALESCE(EXCLUDED.payment_type, lead_ai_state.payment_type),
       has_trade_in = COALESCE(EXCLUDED.has_trade_in, lead_ai_state.has_trade_in),
       client_name = COALESCE(EXCLUDED.client_name, lead_ai_state.client_name),
       purchase_timeline = COALESCE(EXCLUDED.purchase_timeline, lead_ai_state.purchase_timeline),
       lead_score = EXCLUDED.lead_score,
       updated_at = NOW()`,
    [
      dealershipId,
      leadId,
      analysis.stage,
      paymentType,
      hasTradeIn,
      detectedName,
      timeline,
      analysis.score_label
    ]
  );

  await pool.query(
    `UPDATE leads
     SET name = COALESCE($1, name),
         score = GREATEST(COALESCE(score, 0), $2),
         priority_score = GREATEST(COALESCE(priority_score, 0), $3),
         last_contact_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
       AND dealership_id = $5`,
    [detectedName, analysis.score, analysis.priority_score, leadId, dealershipId]
  );
}

async function handleLeadMessage({ leadId, dealershipId, message, history = [] }) {
  if (!leadId || !dealershipId || !message) return { reply: null };

  const context = await getLeadContext(leadId, dealershipId);
  const settings = await aiSettings.getSettings(dealershipId);
  const intents = detectIntent(message);
  const score = scoreLead({ intents, hasVehicle: Boolean(context.vehicle_id), message });
  const analysis = {
    intents,
    score,
    score_label: scoreLabel(score),
    priority_score: clamp(score + (intents.includes("visit") ? 10 : 0), 0, 100),
    stage: stageForAnalysis(intents, score),
    handoff_to_human: score >= 78 || intents.includes("visit") || intents.includes("hot_timing")
  };

  await updateLeadState(leadId, dealershipId, message, analysis);

  if (settings && settings.ai_enabled === false) {
    return {
      reply: null,
      analysis,
      ai_enabled: false,
      handoffToHuman: true
    };
  }

  let reply = null;
  try {
    reply = await generateAiReply(context, message, history, analysis);
  } catch (err) {
    console.warn("[lead_ai_reception] Falha ao gerar resposta OpenAI:", err.message);
  }

  if (!reply) reply = buildFallbackReply(context, analysis);

  if (analysis.handoff_to_human && !/consultor|vendedor/i.test(reply)) {
    reply = `${reply} Vou chamar um consultor para continuar com voce.`;
  }

  return {
    reply,
    analysis,
    ai_enabled: true,
    handoffToHuman: analysis.handoff_to_human
  };
}

module.exports = {
  handleLeadMessage,
  detectIntent,
  scoreLead
};
