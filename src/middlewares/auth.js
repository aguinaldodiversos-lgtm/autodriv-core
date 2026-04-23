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

        req.subscription = subResult.rows[0];
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

module.exports = auth;
