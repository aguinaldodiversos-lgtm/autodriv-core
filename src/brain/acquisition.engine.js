/**
 * Canais de aquisição para o relatório executivo (CommonJS / pool pg).
 * Usa `leads` + `dealership_id`. `marketing_spend` é opcional (pode não existir no deploy).
 * Versão .ts (AcquisitionIntelligenceEngine) fica no runtime experimental.
 */

class AcquisitionIntelligenceEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {string|number} tenantId - dealership_id
   * @returns {Promise<Array<{ source, totalLeads, vendidos, cac, roi }>>}
   */
  async analyze(tenantId) {
    const { rows: leads } = await this.db.query(
      `SELECT source,
              COUNT(*)::int AS total,
              SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END)::int AS vendidos
       FROM leads
       WHERE dealership_id = $1::int
       GROUP BY source`,
      [tenantId]
    );

    let custos = [];
    try {
      const spend = await this.db.query(
        `SELECT source, COALESCE(SUM(cost), 0)::numeric AS investimento
         FROM marketing_spend
         WHERE dealership_id = $1::int
         GROUP BY source`,
        [tenantId]
      );
      custos = spend.rows;
    } catch {
      // tabela/columna ausente no ambiente
    }

    return leads.map((l) => {
      const investimento = Number(
        custos.find((c) => c.source === l.source)?.investimento || 0
      );
      const vend = Number(l.vendidos) || 0;
      const cac = investimento / (vend || 1);
      const roi = (vend * 3000 - investimento) / (investimento || 1);

      return {
        source: l.source,
        totalLeads: l.total,
        vendidos: vend,
        cac,
        roi
      };
    });
  }
}

module.exports = AcquisitionIntelligenceEngine;
