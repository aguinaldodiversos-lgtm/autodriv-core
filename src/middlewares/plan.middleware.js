const pool = require("../config/db");
const PLANS = require("../config/plans");

module.exports = function checkPlanLimit(resource) {
  return async (req, res, next) => {
    try {
      const dealershipId = req.user?.dealership_id;

      if (!dealershipId) {
        return res.status(401).json({
          error: "Usuário inválido"
        });
      }

      /* =====================================================
         BUSCA ASSINATURA
      ===================================================== */
      const subResult = await pool.query(
        `SELECT * FROM subscriptions
         WHERE dealership_id = $1
         LIMIT 1`,
        [dealershipId]
      );

      if (!subResult.rows.length) {
        return res.status(403).json({
          error: "Assinatura não encontrada"
        });
      }

      const sub = subResult.rows[0];
      const planConfig = PLANS[sub.plan];

      if (!planConfig) {
        return res.status(500).json({
          error: "Plano inválido configurado"
        });
      }

      /* =====================================================
         BLOQUEIO TRIAL EXPIRADO
      ===================================================== */
      if (sub.plan === "trial") {
        const now = new Date();
        const endDate = new Date(sub.current_period_end);

        if (now > endDate) {
          return res.status(403).json({
            error: "trial_expired",
            message:
              "Seu período de teste expirou. Escolha um plano para continuar."
          });
        }
      }

      /* =====================================================
         BLOQUEIO ASSINATURA INATIVA
      ===================================================== */
      if (sub.plan !== "trial" && sub.status !== "active") {
        return res.status(403).json({
          error: "subscription_inactive",
          message: "Sua assinatura está inativa."
        });
      }

      /* =====================================================
         SE NÃO EXISTE RECURSO NO PLANO
      ===================================================== */
      if (!planConfig.limits || !(resource in planConfig.limits)) {
        return next();
      }

      const limit = planConfig.limits[resource];

      /* =====================================================
         RECURSO BOOLEANO
      ===================================================== */
      if (limit === false) {
        return res.status(403).json({
          error: "feature_not_available",
          message: "Recurso disponível apenas em planos superiores."
        });
      }

      if (limit === true || limit === "enabled") {
        return next();
      }

      /* =====================================================
         RECURSO NUMÉRICO
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

      if (resource === "users") {
        countQuery = `
          SELECT COUNT(*) FROM users
          WHERE dealership_id = $1
        `;
      }

      if (!countQuery) return next();

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
