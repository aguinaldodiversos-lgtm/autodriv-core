const pool = require("../config/db");
const PLANS = require("../config/plans");

module.exports = function checkPlanLimit(resource) {
  return async (req, res, next) => {
    try {
      // LOGS TEMPORÁRIOS (diagnóstico)
      console.log("USER:", req.user);
      console.log("DEALERSHIP ID:", req.user?.dealership_id);

      const dealershipId = req.user?.dealership_id;

      if (!dealershipId) {
        return res.status(401).json({
          error: "Usuário sem dealership_id"
        });
      }

      const subResult = await pool.query(
        `SELECT * FROM subscriptions
         WHERE dealership_id = $1
         AND status = 'active'
         AND current_period_end > NOW()
         LIMIT 1`,
        [dealershipId]
      );

      if (subResult.rows.length === 0) {
        return res.status(403).json({ error: "Assinatura não encontrada" });
      }

      const sub = subResult.rows[0];
      const plan = PLANS[sub.plan];

      if (!plan) {
        return res.status(500).json({
          error: "Plano inválido configurado"
        });
      }

      let countQuery = "";

      if (resource === "vehicles") {
        countQuery = `
          SELECT COUNT(*) FROM vehicles
          WHERE dealership_id = $1
        `;
      }

      if (!countQuery) return next();

      const countResult = await pool.query(countQuery, [dealershipId]);
      const total = parseInt(countResult.rows[0].count);

      const limit = plan.limits[resource];

      if (limit !== "unlimited" && total >= limit) {
        return res.status(403).json({
          error: "plan_limit_reached",
          message: `Limite de ${resource} atingido. Faça upgrade do plano.`
        });
      }

      next();
    } catch (error) {
      console.error("PLAN MIDDLEWARE ERROR:", error);
      return res.status(500).json({
        error: "Erro interno ao verificar plano"
      });
    }
  };
};
