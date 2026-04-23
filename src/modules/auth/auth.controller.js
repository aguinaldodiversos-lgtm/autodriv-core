const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../../config/env");

/** Payload único do sistema (validado em middlewares/auth.js). */
function generateToken(user) {
  return jwt.sign(
    {
      user_id: user.id,
      dealership_id: user.dealership_id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function register(req, res) {
  const { dealership_name, name, email, password } = req.body;

  if (!dealership_name || !name || !email || !password) {
    return res.status(400).json({
      error: "Campos obrigatórios: dealership_name, name, email, password"
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // verifica se usuário já existe
    const existingUser = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Email já cadastrado"
      });
    }

    /* =========================
       CRIA LOJA
    ========================== */
    const dealershipResult = await client.query(
      `INSERT INTO dealerships (name, email)
       VALUES ($1,$2)
       RETURNING *`,
      [dealership_name, normalizedEmail]
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
        normalizedEmail,
        hashedPassword
      ]
    );

    const user = userResult.rows[0];

    /* =========================
       CRIA ASSINATURA TRIAL (15 DIAS)
    ========================== */
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 15);

    await client.query(
      `INSERT INTO subscriptions
       (dealership_id, plan, status, current_period_end)
       VALUES ($1,'trial','active',$2)`,
      [dealership.id, trialEnd]
    );

    await client.query("COMMIT");

    const token = generateToken(user);

    res.json({
      token,
      dealership: {
        id: dealership.id,
        name: dealership.name
      },
      trial_ends_at: trialEnd
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro no registro:", err);
    res.status(500).json({ error: "Erro no registro" });
  } finally {
    client.release();
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email e senha são obrigatórios"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    const token = generateToken(user);

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
