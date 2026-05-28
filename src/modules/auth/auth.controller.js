const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../../config/env");

const ROLE_PERMISSIONS = {
  admin: [
    "dashboard:view",
    "clientes:view",
    "clientes:create",
    "clientes:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "veiculos:view",
    "veiculos:create",
    "veiculos:update",
    "contratos:view",
    "contratos:create",
    "contratos:update",
    "financeiro:view",
    "ia:view",
    "ia:execute",
    "settings:view",
    "settings:update",
    "users:manage"
  ],
  manager: [
    "dashboard:view",
    "clientes:view",
    "clientes:create",
    "clientes:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "veiculos:view",
    "veiculos:create",
    "veiculos:update",
    "contratos:view",
    "contratos:create",
    "contratos:update",
    "financeiro:view",
    "ia:view",
    "ia:execute",
    "settings:view"
  ],
  seller: [
    "dashboard:view",
    "clientes:view",
    "clientes:create",
    "clientes:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "veiculos:view",
    "contratos:view",
    "contratos:create",
    "ia:view",
    "ia:execute"
  ],
  maintenance: [
    "dashboard:view",
    "clientes:view",
    "leads:view",
    "veiculos:view",
    "veiculos:update",
    "ia:view"
  ]
};

const INVALID_CREDENTIALS_MESSAGE = "Credenciais invalidas";
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isStrongPassword(password) {
  const value = String(password || "");
  return (
    value.length >= MIN_PASSWORD_LENGTH &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}

/** Payload Ãºnico do sistema (validado em middlewares/auth.js). */
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

async function ensureAuthSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS dealerships (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      dealership_id INT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      dealership_id INT,
      plan TEXT DEFAULT 'trial',
      status TEXT DEFAULT 'active',
      current_period_end TIMESTAMP,
      mp_subscription_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    ALTER TABLE dealerships
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `);

  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS dealership_id INT,
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS password TEXT,
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `);

  await client.query(`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS dealership_id INT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
      ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_users_dealership
    ON users (dealership_id);
  `);
}

async function secureRegister(req, res) {
  const { dealership_name, name, email, password } = req.body || {};

  if (!dealership_name || !name || !email || !password) {
    return res.status(400).json({
      error: "Campos obrigatorios: dealership_name, name, email, password"
    });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      error:
        "Senha fraca. Use pelo menos 8 caracteres, com letra maiuscula, minuscula e numero."
    });
  }

  const normalizedEmail = normalizeEmail(email);
  const client = await pool.connect();

  try {
    await ensureAuthSchema(client);
    await client.query("BEGIN");

    const existingUser = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Nao foi possivel criar conta com estes dados"
      });
    }

    const dealershipResult = await client.query(
      `INSERT INTO dealerships (name, email)
       VALUES ($1,$2)
       RETURNING *`,
      [String(dealership_name).trim(), normalizedEmail]
    );

    const dealership = dealershipResult.rows[0];
    const hashedPassword = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users
       (dealership_id, name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,'admin')
       RETURNING *`,
      [dealership.id, String(name).trim(), normalizedEmail, hashedPassword]
    );

    const user = userResult.rows[0];
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 15);

    await client.query(
      `INSERT INTO subscriptions
       (dealership_id, email, plan, status, current_period_end)
       VALUES ($1,$2,'trial','active',$3)
       ON CONFLICT (dealership_id)
       DO UPDATE SET
         email = EXCLUDED.email,
         plan = 'trial',
         status = 'active',
         current_period_end = EXCLUDED.current_period_end,
         updated_at = NOW()`,
      [dealership.id, normalizedEmail, trialEnd]
    );

    await client.query("COMMIT");

    res.json({
      token: generateToken(user),
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

async function secureLogin(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email e senha sao obrigatorios"
      });
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [normalizeEmail(email)]
    );

    const user = result.rows[0];
    const storedPasswordHash = user ? user.password_hash || user.password : null;
    const valid = storedPasswordHash
      ? await bcrypt.compare(password, storedPasswordHash)
      : false;

    if (!user || !valid) {
      return res.status(401).json({ error: INVALID_CREDENTIALS_MESSAGE });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({
        error: "USER_BLOCKED",
        message: "Usuario bloqueado. Entre em contato com o suporte."
      });
    }

    res.json({ token: generateToken(user) });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro no login" });
  }
}

async function me(req, res) {
  try {
    const userResult = await pool.query(
      `SELECT id, dealership_id, name, email, role, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Usuario nao encontrado" });
    }

    const dealershipResult = await pool.query(
      `SELECT id, name, email, phone, created_at
       FROM dealerships
       WHERE id = $1`,
      [user.dealership_id]
    );

    const subscriptionResult = await pool.query(
      `SELECT id, plan, status, current_period_end, updated_at
       FROM subscriptions
       WHERE dealership_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [user.dealership_id]
    );

    res.json({
      user: {
        id: user.id,
        dealership_id: user.dealership_id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      dealership: dealershipResult.rows[0] || null,
      subscription: subscriptionResult.rows[0] || null,
      permissions: ROLE_PERMISSIONS[user.role] || []
    });
  } catch (err) {
    console.error("Erro ao obter sessao:", err);
    res.status(500).json({ error: "Erro ao obter sessao" });
  }
}

module.exports = {
  register: secureRegister,
  login: secureLogin,
  me
};
