const pool = require("../../config/db");
const {
  getStockStatus,
  calculateDaysInStock
} = require("./stockIntelligence.service");

const {
  getPriceIntelligence
} = require("../vehicles/priceIntelligence.service");

async function getDashboard(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    /* =========================
       ESTOQUE + PREÇO INTELIGENTE
    ========================== */
    const vehiclesResult = await pool.query(
      `SELECT id, brand, model, entry_date, price, fipe_price
       FROM vehicles
       WHERE dealership_id = $1
       AND status = 'available'`,
      [dealershipId]
    );

    let stockSummary = {
      healthy: 0,
      attention: 0,
      slow: 0,
      critical: 0
    };

    let alerts = [];

    vehiclesResult.rows.forEach((v) => {
      const days = calculateDaysInStock(v.entry_date);
      const stock = getStockStatus(days);

      stockSummary[stock.status]++;

      /* =========================
         ALERTAS DE ESTOQUE
      ========================== */
      if (stock.status === "attention") {
        alerts.push({
          type: "stock",
          level: "warning",
          message: `${v.brand} ${v.model} com ${days} dias em estoque`
        });
      }

      if (stock.status === "slow") {
        alerts.push({
          type: "stock",
          level: "alert",
          message: `${v.brand} ${v.model} com giro lento (${days} dias)`
        });
      }

      if (stock.status === "critical") {
        alerts.push({
          type: "stock",
          level: "critical",
          message: `${v.brand} ${v.model} parado há ${days} dias`
        });
      }

      /* =========================
         PREÇO INTELIGENTE
      ========================== */
      const priceIntel = getPriceIntelligence(
        v.price,
        v.fipe_price
      );

      if (priceIntel.status === "overpriced") {
        alerts.push({
          type: "price",
          level: "critical",
          message: `${v.brand} ${v.model} está ${priceIntel.difference}% acima da FIPE`
        });
      }

      if (priceIntel.status === "above_market") {
        alerts.push({
          type: "price",
          level: "warning",
          message: `${v.brand} ${v.model} está ${priceIntel.difference}% acima da FIPE`
        });
      }
    });

    /* =========================
       LEADS
    ========================== */
    const leadsResult = await pool.query(
      `SELECT COUNT(*) FROM leads
       WHERE dealership_id = $1
       AND status = 'new'`,
      [dealershipId]
    );

    const newLeads = parseInt(leadsResult.rows[0].count);

    if (newLeads > 0) {
      alerts.push({
        type: "lead",
        level: "warning",
        message: `${newLeads} leads aguardando atendimento`
      });
    }

    /* =========================
       RESPOSTA FINAL
    ========================== */
    res.json({
      stock: stockSummary,
      alerts
    });

  } catch (err) {
    console.error("Erro no dashboard:", err);
    res.status(500).json({
      error: "Erro ao carregar dashboard"
    });
  }
}

module.exports = {
  getDashboard
};
