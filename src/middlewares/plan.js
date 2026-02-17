const pool = require("../config/db");

module.exports = async function planMiddleware(req, res, next) {
  try {
    const dealershipId = req.user.dealership_id;

    let result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE dealership_id = $1`,
      [dealershipId]
    );

    // Se não existir assinatura, cria trial automaticamente
    if (result.rows.length === 0) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      await pool.query(
        `INSERT INTO subscriptions
         (dealership_id, email, plan, status, current_period_end)
         VALUES ($1,'trial@autodriv.com','trial','active',$2)`,
        [dealershipId, trialEnd]
      );

      // busca novamente
      result = await pool.query(
        `SELECT * FROM subscriptions
         WHERE dealership_id = $1`,
        [dealershipId]
      );
    }

    const sub = result.rows[0];

    if (!sub) {
      return res.status(403).json({
        error: "Assinatura não encontrada"
      });
    }

    // verificação de bloqueio
    const now = new Date();
    const end = new Date(sub.current_period_end);

    if (now > end && sub.status !== "active") {
      return res.status(403).json({
        error: "Assinatura bloqueada"
      });
    }

    req.subscription = sub;
    next();

  } catch (err) {
    console.error("Erro no plan middleware:", err);
    res.status(500).json({ error: "Erro de assinatura" });
  }
};
