const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =========================
// INIT DB
// =========================
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL CHECK (plan IN ('mensal','anual')),
      status TEXT NOT NULL CHECK (status IN ('active','past_due','canceled')),
      current_period_end TIMESTAMP NOT NULL,
      mp_subscription_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("Tabela subscriptions pronta");
}

initDB();

// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.send("AutoDriv Core OK");
});

// =========================
// WEBHOOK REAL MERCADO PAGO
// =========================
app.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type !== "subscription" && type !== "payment") {
      return res.sendStatus(200);
    }

    // fetch é NATIVO no Node 18+ (Render)
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${data.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }
    );

    const mpSub = await mpResponse.json();

    if (!mpSub.payer_email) {
      return res.sendStatus(200);
    }

    const email = mpSub.payer_email;

    const status =
      mpSub.status === "authorized"
        ? "active"
        : mpSub.status === "paused" || mpSub.status === "pending"
        ? "past_due"
        : "canceled";

    const plan =
      mpSub.reason?.toLowerCase().includes("anual") ? "anual" : "mensal";

    const currentPeriodEnd = new Date(mpSub.next_payment_date);

    await pool.query(
      `
      INSERT INTO subscriptions
        (email, plan, status, current_period_end, mp_subscription_id, updated_at)
      VALUES
        ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
      `,
      [
        email,
        plan,
        status,
        currentPeriodEnd,
        mpSub.id
      ]
    );

    console.log("Assinatura atualizada:", email, status);
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro webhook:", err);
    res.sendStatus(500);
  }
});

// =========================
// ACCESS CHECK (APP)
// =========================
app.get("/access-check", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.json({ allowed: false });
  }

  const result = await pool.query(
    `
    SELECT status, current_period_end
    FROM subscriptions
    WHERE email = $1
    `,
    [email]
  );

  if (result.rows.length === 0) {
    return res.json({ allowed: false });
  }

  const sub = result.rows[0];
  const now = new Date();

  const allowed =
    sub.status === "active" &&
    new Date(sub.current_period_end) > now;

  res.json({ allowed });
});

// =========================
// SERVER
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
