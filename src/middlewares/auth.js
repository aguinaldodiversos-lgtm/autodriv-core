const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { JWT_SECRET } = require("../config/env");

/**
 * Autenticação unificada:
 * - JWT emitido apenas por modules/auth (claims: user_id, dealership_id, role).
 * - Sempre recarrega o usuário do banco (fonte de verdade).
 * - requireSubscription: quando true, exige linha em subscriptions e preenche req.subscription.
 */
function createAuthMiddleware({ requireSubscription = false } = {}) {
  return async function auth(req, res, next) {
    try {
      if (req.user && (!requireSubscription || req.subscription)) {
        return next();
      }

      const header = req.headers.authorization;
      if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não informado" });
      }

      const token = header.slice(7).trim();
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: "Token inválido" });
      }

      const userId = decoded.user_id ?? decoded.id;
      if (!userId) {
        return res.status(401).json({ error: "Token inválido" });
      }

      const dealershipIdClaim = decoded.dealership_id;

      const userResult = await pool.query(
        `SELECT id, email, dealership_id, role
         FROM users
         WHERE id = $1`,
        [userId]
      );

      const user = userResult.rows[0];
      if (!user) {
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      if (
        dealershipIdClaim != null &&
        Number(dealershipIdClaim) !== Number(user.dealership_id)
      ) {
        return res.status(401).json({ error: "Token inválido" });
      }

      if (user.id == null) {
        return res.status(401).json({ error: "Sessão inválida" });
      }

      if (user.dealership_id == null) {
        return res
          .status(403)
          .json({ error: "Usuário sem loja (dealership) associada" });
      }

      req.user = {
        id: user.id,
        email: user.email,
        dealership_id: user.dealership_id,
        role: user.role
      };

      if (requireSubscription) {
        const subResult = await pool.query(
          `SELECT *
           FROM subscriptions
           WHERE dealership_id = $1
           ORDER BY id DESC
           LIMIT 1`,
          [user.dealership_id]
        );

        if (!subResult.rows.length) {
          return res.status(403).json({ error: "Assinatura não encontrada" });
        }

        const subscription = subResult.rows[0];

        if (subscription.plan === "trial") {
          const end = subscription.current_period_end
            ? new Date(subscription.current_period_end)
            : null;
          if (!end || Number.isNaN(end.getTime()) || end < new Date()) {
            return res.status(403).json({
              error: "trial_expired",
              message: "Seu perÃ­odo de teste expirou. Escolha um plano para continuar."
            });
          }
        } else if (subscription.status !== "active") {
          return res.status(403).json({
            error: "subscription_inactive",
            message: "Sua assinatura estÃ¡ inativa."
          });
        }

        req.subscription = subscription;
      }

      next();
    } catch (err) {
      console.error("Erro no auth:", err);
      res.status(500).json({ error: "Erro de autenticação" });
    }
  };
}

const auth = createAuthMiddleware({ requireSubscription: false });
auth.withSubscription = createAuthMiddleware({ requireSubscription: true });

auth.requireRoles = (...roles) => {
  const allowed = new Set(roles);

  return function requireRoles(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Token não informado" });
    }

    if (!allowed.has(req.user.role)) {
      return res.status(403).json({ error: "Acesso não autorizado" });
    }

    next();
  };
};

auth.requireSameDealershipParam = (paramName = "dealershipId") => {
  return function requireSameDealershipParam(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Token não informado" });
    }

    const paramValue = req.params[paramName];
    const paramId = Number(paramValue);

    if (!Number.isFinite(paramId)) {
      return res.status(400).json({ error: `${paramName} inválido` });
    }

    if (Number(req.user.dealership_id) !== paramId) {
      return res.status(403).json({ error: "Acesso nÃ£o autorizado" });
    }

    next();
  };
};

module.exports = auth;
