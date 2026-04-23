/**
 * Pontos de decisão de “score” no produto (não misturar):
 * - scoreLead(message): heurística por texto (IA local) — não persiste.
 * - getLeadScore(leadId, user): leitura API (colunas leads.score / priority_score + contagem).
 * - modules/lead_priority/priority.service: atualiza priority_score por regras de funil (worker/UI).
 */
const pool = require("../../config/db");
const localAI = require("../../infrastructure/ai/localAI.service");

class LeadScoreService {
  async scoreLead(message) {
    try {
      const sentiment = await localAI.classify(message);

      const positivo =
        sentiment[0].label === "POSITIVE";

      const urgencia =
        message.includes("hoje") ||
        message.includes("agora");

      let score = 50;

      if (positivo) score += 20;
      if (urgencia) score += 20;

      return Math.min(100, score);
    } catch (error) {
      return 50;
    }
  }

  /**
   * GET /api/leads/:id/score — contrato estável:
   * @returns {Promise<{ leadId, score, priorityScore, status, messageCount }>}
   */
  async getLeadScore(leadId, user) {
    const leadRes = await pool.query(
      `SELECT id, score, priority_score, status
       FROM leads
       WHERE id = $1 AND dealership_id = $2`,
      [leadId, user.dealership_id]
    );

    if (!leadRes.rows.length) {
      throw new Error("Lead não encontrado");
    }

    const lead = leadRes.rows[0];

    const msgRes = await pool.query(
      `SELECT COUNT(*)::int AS c
       FROM lead_conversations c
       INNER JOIN leads l ON l.id = c.lead_id
       WHERE c.lead_id = $1 AND l.dealership_id = $2`,
      [leadId, user.dealership_id]
    );

    return {
      leadId: lead.id,
      score: lead.score ?? 0,
      priorityScore: lead.priority_score,
      status: lead.status,
      messageCount: msgRes.rows[0].c
    };
  }
}

module.exports = new LeadScoreService();
