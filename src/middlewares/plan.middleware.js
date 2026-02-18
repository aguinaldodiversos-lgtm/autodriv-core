const pool = require("../config/db");
const PLANS = require("../config/plans");

module.exports = function checkPlanLimit(resource) {
  return async (req, res, next) => {
    try {
      const dealershipId = req.user?.dealership_id;

      if (!dealershipId) {
        return res.status(401).json({
          error: "Usuário sem dealership_id"
        });
      }

      /* =====================================================
         BUSCA ASSINATURA ATIVA
      ===================================================== */
      const subResult = await pool.query(
        `SELECT * FROM subscriptions
         WHERE dealership_id = $1
         AND status = 'active'
         AND current_period_end > NOW()
         LIMIT 1`,
        [dealershipId]
      );

      if (subResult.rows.length === 0) {
        return res.status(403).json({
          error: "Assinatura não encontrada ou expirada"
        });
      }

      const sub = subResult.rows[0];
      const plan = PLANS[sub.plan];

      if (!plan) {
        return res.status(500).json({
          error: "Plano inválido configurado"
        });
      }

      /* =====================================================
         SE NÃO EXISTE LIMITE CONFIGURADO PARA O RECURSO
      ===================================================== */
      if (!plan.limits || !(resource in plan.limits)) {
        return next();
      }

      const limit = plan.limits[resource];

      /* =====================================================
         RECURSO BOOLEANO (ex: whatsapp, ia, automations)
      ===================================================== */
      if (limit === false) {
        return res.status(403).json({
          error: "feature_not_available",
          message: `Recurso disponível apenas em planos superiores.`
        });
      }

      if (limit === true || limit === "enabled") {
        return next();
      }

      /* =====================================================
         RECURSO NUMÉRICO (ex: vehicles, leads)
      ===================================================== */
      let countQuery = "";

      if (resource === "vehicles") {
        countQuery = `
          SELECT COUNT(*) FROM vehicles
          WHERE dealership_id = $1
        `;
      }

      if (resource === "leads") {
        countQuery = `
          SELECT COUNT(*) FROM leads
          WHERE dealership_id = $1
        `;
      }

      if (!countQuery) {
        return next();
      }

      const countResult = await pool.query(countQuery, [dealershipId]);
      const total = parseInt(countResult.rows[0].count);

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
