const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function register(req, res) {
  try {
    const { dealership_name, name, email, password } = req.body;

    if (!dealership_name || !name || !email || !password) {
      return res.status(400).json({
        error: "Campos obrigatórios: dealership_name, name, email, password"
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /* =========================
         CRIA LOJA
      ========================== */
      const dealershipResult = await client.query(
        `INSERT INTO dealerships (name, email)
         VALUES ($1,$2)
         RETURNING *`,
        [dealership_name, email]
      );

      const dealership = dealershipResult.rows[0];

      /* =========================
         CRIA USUÁRIO ADMIN
      ========================== */
      const hashedPassword = await bcrypt.hash(password, 10);

      const userResult = await client.query(
        `INSERT INTO users
         (dealership_id, name, email, password_hash, role)
         VALUES ($1,$2,$3,$4,'admin')
         RETURNING *`,
        [
          dealership.id,
          name,
          email,
          hashedPassword
        ]
      );

      const user = userResult.rows[0];

      /* =========================
         CRIA ASSINATURA TRIAL
      ========================== */
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      await client.query(
        `INSERT INTO subscriptions
         (dealership_id, email, plan, status, current_period_end)
         VALUES ($1,$2,'trial','active',$3)`,
        [
          dealership.id,
          email,
          trialEnd
        ]
      );

      await client.query("COMMIT");

      /* =========================
         GERA TOKEN
      ========================== */
      const token = jwt.sign(
        {
          user_id: user.id,
          dealership_id: dealership.id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token });

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error("Erro no registro:", err);
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    const token = jwt.sign(
      {
        user_id: user.id,
        dealership_id: user.dealership_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro no login" });
  }
}

module.exports = {
  register,
  login
};
