const jwt = require("jsonwebtoken");
const pool = require("../config/db");

module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não informado" });
    }

    const token = header.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"]
      });
    } catch (err) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const userId = decoded.id || decoded.user_id;

    if (!userId) {
      return res.status(401).json({ error: "Token inválido" });
    }

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

    // padrão único do sistema
    req.user = {
      id: user.id,
      email: user.email,
      dealership_id: user.dealership_id,
      role: user.role
    };

    next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err);
    res.status(500).json({ error: "Erro de autenticação" });
  }
};
