const pool = require("../../config/db");
const engine = require("./conversation.engine");
const convoRepo = require("../lead_conversations/leadConversations.repository");
const stateRepo = require("../lead_ai_state/leadAiState.repository");

async function handleMessage(leadId, message) {
  const leadResult = await pool.query(
    `SELECT * FROM leads WHERE id = $1`,
    [leadId]
  );

  const lead = leadResult.rows[0];
  if (!lead) throw new Error("Lead não encontrado");

  // salva mensagem do cliente
  await convoRepo.addMessage({
    dealership_id: lead.dealership_id,
    lead_id: leadId,
    role: "client",
    message
  });

  // busca estado da IA
  let state = await stateRepo.getState(leadId);

  if (!state) {
    state = await stateRepo.createState({
      dealership_id: lead.dealership_id,
      lead_id: leadId,
      stage: "new"
    });
  }

  // busca histórico
  const messagesRaw = await convoRepo.getRecentMessages(leadId, 6);

  const messages = messagesRaw.map(m => ({
    role: m.role === "client" ? "user" : "assistant",
    content: m.message
  }));

  // gera resposta
  const reply = await engine.generateReply({}, messages);

  // salva resposta da IA
  await convoRepo.addMessage({
    dealership_id: lead.dealership_id,
    lead_id: leadId,
    role: "ai",
    message: reply
  });

  // atualiza estágio
  await stateRepo.updateStage(leadId, "qualifying");

  return { reply };
}

module.exports = {
  handleMessage
};
