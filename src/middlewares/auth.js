const jwt = require("jsonwebtoken");
const pool = require("../config/db");

module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "Token não informado" });
    }

    const token = header.replace("Bearer ", "");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Token inválido" });
    }

    req.user = decoded;

    const dealershipId = decoded.dealership_id;
    const userId = decoded.user_id;

    /* =============================
       BUSCA USUÁRIO
    ============================= */
    const userResult = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    /* =============================
       BUSCA ASSINATURA
    ============================= */
    let subResult = await pool.query(
      `SELECT * FROM subscriptions
       WHERE dealership_id = $1`,
      [dealershipId]
    );

    let subscription = subResult.rows[0];

    /* =============================
       FALLBACK: BUSCA PELO EMAIL
    ============================= */
    if (!subscription) {
      const subByEmail = await pool.query(
        `SELECT * FROM subscriptions
         WHERE email = $1`,
        [user.email]
      );

      subscription = subByEmail.rows[0];
    }

    /* =============================
       CRIA TRIAL SE NÃO EXISTIR
    ============================= */
    if (!subscription) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 15);

      await pool.query(
        `INSERT INTO subscriptions
         (dealership_id, email, plan, status, current_period_end)
         VALUES ($1,$2,'trial','active',$3)`,
        [dealershipId, user.email, trialEnd]
      );

      const newSub = await pool.query(
        `SELECT * FROM subscriptions
         WHERE dealership_id = $1`,
        [dealershipId]
      );

      subscription = newSub.rows[0];
    }

    if (!subscription) {
      return res.status(403).json({
        error: "Assinatura não encontrada"
      });
    }

    /* =============================
       CONTROLE DE VENCIMENTO
    ============================= */
    const now = new Date();
    const end = new Date(subscription.current_period_end);

    if (now > end) {
      const diffDays = (now - end) / (1000 * 60 * 60 * 24);

      if (diffDays <= 5) {
        req.subscription_status = "grace";
      } else {
        return res.status(403).json({
          error: "Assinatura bloqueada",
          code: "SUBSCRIPTION_BLOCKED"
        });
      }
    }

    req.subscription = subscription;

    next();
  } catch (err) {
    console.error("Erro no auth middleware:", err);
    res.status(500).json({ error: "Erro de autenticação" });
  }
};
