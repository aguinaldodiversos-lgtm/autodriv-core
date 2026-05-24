/**
 * Motor de estoque para o relatório executivo (CommonJS / pool pg).
 * Alinhado ao schema real: dealership_id, COALESCE(entry_date, created_at).
 * Versão .ts (StockIntelligenceEngine) usa adapter DatabaseClient; mantida para o runtime TS.
 */

class StockIntelligenceEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {string|number} tenantId - dealership_id
   */
  async analyze(tenantId) {
    const { rows: vehicles } = await this.db.query(
      `SELECT id,
              price,
              COALESCE(entry_date, created_at) AS ref_date
       FROM vehicles
       WHERE dealership_id = $1::int
         AND (status = 'available' OR status IS NULL)`,
      [tenantId]
    );

    const now = new Date();
    const faixas = Object.create(null);
    let capitalTravado = 0;
    let somaDias = 0;

    for (const v of vehicles) {
      const ref = v.ref_date ? new Date(v.ref_date) : now;
      const dias = Math.max(
        0,
        (now.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)
      );
      const price = Number(v.price) || 0;
      // Sem coluna cost nas migrations: proxy coerente com general-manager (margem aproximada)
      const custoAprox = price > 0 ? price * 0.85 : 0;

      const faixa =
        price < 30000
          ? "0-30k"
          : price < 60000
            ? "30-60k"
            : price < 100000
              ? "60-100k"
              : "100k+";

      if (!faixas[faixa]) {
        faixas[faixa] = { total: 0, somaDias: 0 };
      }
      faixas[faixa].total++;
      faixas[faixa].somaDias += dias;

      capitalTravado += custoAprox;
      somaDias += dias;
    }

    const giroPorFaixa = Object.entries(faixas).map(([faixa, data]) => ({
      faixa,
      diasMedios: data.somaDias / data.total,
      total: data.total
    }));

    const diasMediosEstoque = somaDias / (vehicles.length || 1);

    const sugestaoDesova = vehicles
      .filter((v) => {
        const ref = v.ref_date ? new Date(v.ref_date) : now;
        const dias =
          (now.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24);
        return dias > 60;
      })
      .map((v) => v.id);

    return {
      giroPorFaixa,
      diasMediosEstoque,
      capitalTravado,
      sugestaoDesova
    };
  }
}

module.exports = StockIntelligenceEngine;
