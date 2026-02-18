const pool = require("../config/db");
const convoRepo = require("../modules/lead_conversations/leadConversations.repository");

function getFollowUpMessage(step) {
  const messages = {
    1: "Conseguiu ver as informações do carro? Se quiser, posso te mostrar ele com calma aqui na loja.",
    2: "Esse modelo tem bastante procura e costuma agradar quem busca economia e conforto. Vale a pena ver pessoalmente. Você consegue passar hoje no fim da tarde ou prefere amanhã?",
    3: "Bom dia! Ontem você falou sobre o carro. Conseguiu ver com calma? Se quiser, pode passar aqui na loja para olhar sem compromisso. Prefere vir hoje ou amanhã?",
    4: "Passando para te avisar que o carro ainda está disponível. Quem procura esse tipo de modelo costuma decidir rápido. Você consegue passar hoje ou prefere outro dia?",
    5: "Oi! Tudo bem? Ainda está procurando carro ou já resolveu por aí? Se quiser, pode passar aqui na loja para ver algumas opções com calma.",
    6: "Essa semana chegaram alguns carros que podem te interessar. Se quiser, pode passar aqui pra dar uma olhada sem compromisso. Prefere vir durante a semana ou no sábado?",
    7: "Oi! Só passando para saber se você ainda está procurando carro. Posso separar algumas opções no seu perfil para você ver aqui na loja.",
    8: "Olá! Ainda está pensando em trocar de carro? Chegaram algumas opções bem interessantes aqui na loja. Se quiser, passa aqui pra ver com calma e tomar um café com a gente."
  };

  return messages[step] || null;
}

async function runFollowUp() {
  console.log("🔁 Rodando follow-up automático...");

  const leads = await pool.query(`
    SELECT
      l.id AS lead_id,
      l.dealership_id,
      s.followup_step,
      MAX(c.created_at) AS last_message_at
    FROM leads l
    JOIN lead_ai_state s ON s.lead_id = l.id
    LEFT JOIN lead_conversations c ON c.lead_id = l.id
    GROUP BY l.id, s.followup_step
  `);

  for (const lead of leads.rows) {
    if (!lead.last_message_at) continue;

    const lastMsg = new Date(lead.last_message_at);
    const now = new Date();
    const diffHours = (now - lastMsg) / (1000 * 60 * 60);

    let nextStep = null;

    if (lead.followup_step === 0 && diffHours >= 0.3) nextStep = 1; // 20 min
    else if (lead.followup_step === 1 && diffHours >= 3) nextStep = 2;
    else if (lead.followup_step === 2 && diffHours >= 24) nextStep = 3;
    else if (lead.followup_step === 3 && diffHours >= 72) nextStep = 4;
    else if (lead.followup_step === 4 && diffHours >= 120) nextStep = 5;
    else if (lead.followup_step === 5 && diffHours >= 168) nextStep = 6;
    else if (lead.followup_step === 6 && diffHours >= 336) nextStep = 7;
    else if (lead.followup_step === 7 && diffHours >= 720) nextStep = 8;

    if (!nextStep) continue;

    const message = getFollowUpMessage(nextStep);
    if (!message) continue;

    await convoRepo.addMessage({
      dealership_id: lead.dealership_id,
      lead_id: lead.lead_id,
      role: "ai",
      message
    });

    await pool.query(
      `UPDATE lead_ai_state
       SET followup_step = $2,
           updated_at = NOW()
       WHERE lead_id = $1`,
      [lead.lead_id, nextStep]
    );

    console.log(`📩 Follow-up step ${nextStep} enviado para lead ${lead.lead_id}`);
  }
}

module.exports = {
  runFollowUp
};
