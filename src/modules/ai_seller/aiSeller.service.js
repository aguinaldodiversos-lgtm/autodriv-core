const OpenAI = require("openai");
const db = require("../../config/db");

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return openai;
}

/* =====================================================
   CONFIGURAÇÕES
===================================================== */

const MODEL = "gpt-4o-mini"; // econômico e eficiente
const MAX_HISTORY_MESSAGES = 15;
const MAX_RESPONSE_TOKENS = 300;

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/* =====================================================
   PROMPT BASE DO VENDEDOR IA
===================================================== */

function buildSystemPrompt() {
  return `
Você é um vendedor profissional de veículos.

Objetivo:
- Qualificar o lead
- Identificar interesse real
- Descobrir orçamento
- Entender forma de pagamento
- trazer o cliente para a loja

Regras:
-Nunca tente vender por mensagem
- Seja natural e humano
- Não pareça robô
- Mensagens curtas e objetivas
- Nunca invente informações
- Sempre conduza para avanço na negociação
- Se o cliente demonstrar interesse forte, tente agendar uma visita 
- Se cliente perguntar preço, responda: Não vamos falar de valores antes de você vir na loja conhecer o veiculo.
- Nunca mencione que é uma IA
- Nunca de desconto ou invente um valor para o veiculo
`;
}

/* =====================================================
   ESTIMATIVA SIMPLES DE TOKENS
===================================================== */

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/* =====================================================
   HANDLE MESSAGE (COM HISTÓRICO)
===================================================== */

async function handleMessage(leadId, message, history = [], context = {}) {
  try {
    if (!leadId || !message) {
      return { reply: null };
    }

    const dealershipId = Number(context.dealershipId);
    if (!Number.isFinite(dealershipId) || dealershipId <= 0) {
      throw httpError("Loja nÃ£o informada", 403);
    }

    /* =========================
       BUSCA DADOS DO LEAD
    ========================== */

    const { rows } = await db.query(
      `SELECT dealership_id, name
       FROM leads
       WHERE id = $1
         AND dealership_id = $2`,
      [leadId, dealershipId]
    );

    const lead = rows[0];
    if (!lead) {
      throw httpError("Lead nÃ£o encontrado", 404);
    }

    /* =========================
       CONSTRUIR MENSAGENS
    ========================== */

    const messages = [];

    messages.push({
      role: "system",
      content: buildSystemPrompt()
    });

    // Histórico limitado
    const limitedHistory = history
      .slice(-MAX_HISTORY_MESSAGES);

    limitedHistory.forEach(item => {
      messages.push({
        role: item.role === "client"
          ? "user"
          : "assistant",
        content: item.message
      });
    });

    // Mensagem atual
    messages.push({
      role: "user",
      content: message
    });

    /* =========================
       CHAMADA OPENAI
    ========================== */

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: MAX_RESPONSE_TOKENS
    });

    const reply =
      response.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return { reply: null };
    }

    /* =========================
       CALCULAR TOKENS
    ========================== */

    const totalTokens = messages.reduce(
      (acc, msg) => acc + estimateTokens(msg.content),
      0
    );

    /* =========================
       SALVAR MÉTRICA (OPCIONAL)
    ========================== */

    try {
      await db.query(
        `UPDATE leads
         SET last_ai_tokens = $1,
             updated_at = NOW()
         WHERE id = $2
           AND dealership_id = $3`,
        [totalTokens, leadId, dealershipId]
      );
    } catch (err) {
      // Não quebrar fluxo se métrica falhar
      console.warn("Falha ao salvar métricas IA");
    }

    return {
      reply,
      tokensUsed: totalTokens
    };

  } catch (error) {
    if (context.strict && error.statusCode) {
      throw error;
    }

    console.error("Erro no aiSeller.handleMessage:", error);

    return {
      reply:
        "Desculpe, tive um problema técnico agora. Pode repetir sua mensagem?",
      error: true
    };
  }
}

module.exports = {
  handleMessage
};
