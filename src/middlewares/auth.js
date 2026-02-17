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

    const subResult = await pool.query(
      `SELECT * FROM subscriptions
       WHERE dealership_id = $1`,
      [decoded.dealership_id]
    );

    if (!subResult.rows.length) {
      return res.status(403).json({
        error: "Assinatura não encontrada"
      });
    }

    req.subscription = subResult.rows[0];

    next();
  } catch (err) {
    console.error("Erro no auth:", err);
    res.status(500).json({ error: "Erro de autenticação" });
  }
};
