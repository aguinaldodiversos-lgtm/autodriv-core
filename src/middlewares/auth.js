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

    // adiciona dados do usuário na requisição
    req.user = decoded;

    const dealershipId = decoded.dealership_id;

    // =============================
    // BUSCA ASSINATURA
    // =============================
    let subResult = await pool.query(
      `SELECT * FROM subscriptions
       WHERE dealership_id = $1`,
      [dealershipId]
    );

    let subscription = subResult.rows[0];

    // Se não existir assinatura, cria trial automaticamente
    if (!subscription) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      await pool.query(
        `INSERT INTO subscriptions
         (dealership_id, email, plan, status, current_period_end)
         VALUES ($1,'trial@autodriv.com','trial','active',$2)`,
        [dealershipId, trialEnd]
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

    // =============================
    // VERIFICA BLOQUEIO
    // =============================
    const now = new Date();
    const end = new Date(subscription.current_period_end);

    if (now > end && subscription.status !== "active") {
      return res.status(403).json({
        error: "Assinatura bloqueada"
      });
    }

    req.subscription = subscription;

    next();
  } catch (err) {
    console.error("Erro no auth middleware:", err);
    res.status(500).json({ error: "Erro de autenticação" });
  }
};
