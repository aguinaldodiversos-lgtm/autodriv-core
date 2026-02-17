const pool = require("../../config/db");
const buildPrompt = require("./aiSeller.prompt");
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function processMessage({ lead_id, message }) {
  // =============================
  // BUSCA LEAD
  // =============================
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1`,
    [lead_id]
  );

  const lead = leadResult.rows[0];

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  // =============================
  // VERIFICA ASSINATURA
  // =============================
  const subResult = await pool.query(
    `SELECT * FROM subscriptions
     WHERE dealership_id = $1`,
    [lead.dealership_id]
  );

  let subscription = subResult.rows[0];

  // Se não existir, cria trial automático
  if (!subscription) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await pool.query(
      `INSERT INTO subscriptions
       (dealership_id, email, plan, status, current_period_end)
       VALUES ($1,'trial@autodriv.com','trial','active',$2)`,
      [lead.dealership_id, trialEnd]
    );

    const newSub = await pool.query(
      `SELECT * FROM subscriptions
       WHERE dealership_id = $1`,
      [lead.dealership_id]
    );

    subscription = newSub.rows[0];
  }

  // Bloqueia planos sem IA
  if (!["master", "trial"].includes(subscription.plan)) {
    return {
      reply:
        "Esse atendimento automático está disponível apenas no plano completo. Posso pedir para um vendedor entrar em contato?"
    };
  }

  // =============================
  // BUSCA VEÍCULO
  // =============================
  const vehicleResult = await pool.query(
    `SELECT * FROM vehicles WHERE id = $1`,
    [lead.vehicle_id]
  );

  const vehicle = vehicleResult.rows[0];

  // =============================
  // BUSCA ESTADO DA IA
  // =============================
  let stateResult = await pool.query(
    `SELECT * FROM lead_ai_state
     WHERE lead_id = $1`,
    [lead_id]
  );

  let state = stateResult.rows[0];

  if (!state) {
    const insertState = await pool.query(
      `INSERT INTO lead_ai_state
       (lead_id, stage)
       VALUES ($1,'new')
       RETURNING *`,
      [lead_id]
    );

    state = insertState.rows[0];
  }

  // =============================
  // DETECTA AGENDAMENTO
  // =============================
  const lowerMsg = message.toLowerCase();

  const visitIntent =
    lowerMsg.includes("quero ver") ||
    lowerMsg.includes("posso ver") ||
    lowerMsg.includes("agendar") ||
    lowerMsg.includes("visita") ||
    lowerMsg.includes("amanhã") ||
    lowerMsg.includes("hoje");

  if (visitIntent && state.stage !== "visit_scheduled") {
    await pool.query(
      `UPDATE lead_ai_state
       SET stage = 'visit_scheduled',
           visit_scheduled_at = NOW()
       WHERE lead_id = $1`,
      [lead_id]
    );

    // cria tarefa
    await pool.query(
      `INSERT INTO tasks
       (dealership_id, lead_id, title, type, status)
       VALUES ($1,$2,'Visita agendada','visit','pending')`,
      [lead.dealership_id, lead_id]
    );

    return {
      reply:
        "Perfeito! Vai ser um prazer te receber na loja. Nosso vendedor vai te atender pessoalmente e mostrar todos os detalhes do carro.",
      visit_scheduled: true
    };
  }

  // =============================
  // MONTA PROMPT
  // =============================
  const prompt = buildPrompt({
    vehicle,
    state
  });

  // =============================
  // CHAMADA OPENAI
  // =============================
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: prompt
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  const reply = completion.choices[0].message.content;

  return { reply };
}

module.exports = {
  processMessage
};
