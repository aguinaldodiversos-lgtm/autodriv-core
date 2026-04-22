const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const pool = require("../../config/db");
const logger = require("../../infrastructure/logger/logger");

const router = express.Router();

const TOKEN_TTL = "7d";
const BCRYPT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      user_id: user.id,
      dealership_id: user.dealership_id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL, algorithm: "HS256" }
  );
}

/* =========================
   LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string" ||
        !email.trim() || !password) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await pool.query(
      `SELECT id, email, password_hash, dealership_id, role
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    // Resposta genérica para bloquear enumeração de usuários.
    const invalid = () =>
      res.status(401).json({ error: "Credenciais inválidas" });

    if (!user) return invalid();

    const valid = await bcrypt.compare(password, user.password_hash || "");
    if (!valid) return invalid();

    res.json({ token: signToken(user) });
  } catch (err) {
    logger.error({ err }, "login failed");
    res.status(500).json({ error: "Erro no login" });
  }
});

/* =========================
   REGISTER (cria loja + admin + trial 15d)
========================= */
router.post("/register", async (req, res) => {
  const {
    dealership_name,
    name,
    email,
    password
  } = req.body || {};

  if (!dealership_name || !name || !email || !password) {
    return res.status(400).json({
      error: "Campos obrigatórios: dealership_name, name, email, password"
    });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      error: "Senha deve ter ao menos 8 caracteres"
    });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const dealership = await client.query(
      `INSERT INTO dealerships (name, email)
       VALUES ($1, $2)
       RETURNING *`,
      [dealership_name, normalizedEmail]
    );

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const userResult = await client.query(
      `INSERT INTO users
       (dealership_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, email, dealership_id, role`,
      [dealership.rows[0].id, name, normalizedEmail, passwordHash]
    );

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 15);

    await client.query(
      `INSERT INTO subscriptions
       (dealership_id, plan, status, current_period_end)
       VALUES ($1, 'trial', 'active', $2)`,
      [dealership.rows[0].id, trialEnd]
    );

    await client.query("COMMIT");

    const user = userResult.rows[0];

    res.json({
      token: signToken(user),
      dealership: {
        id: dealership.rows[0].id,
        name: dealership.rows[0].name
      },
      trial_ends_at: trialEnd
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error({ err }, "register failed");
    res.status(500).json({ error: "Erro no registro" });
  } finally {
    client.release();
  }
});

module.exports = router;
