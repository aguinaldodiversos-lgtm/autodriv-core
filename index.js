const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

/* =========================
   CONFIGURAÇÃO EDITÁVEL
========================= */
const PLANS = {
  trial: {
    name: "Teste Gratuito",
    durationDays: 30,
    limits: {
      vehicles: "unlimited",
      users: "unlimited",
      clients: "unlimited"
    },
    features: {
      leads: true,
      sales_portal: true,
      whatsapp: true,
      advanced_reports: true,
      audit: true
    }
  },
  basic: {
    name: "Plano Básico",
    price: 6.90, // 🔧 EDITÁVEL
    limits: {
      vehicles: 15,
      users: 3,
      clients: 100
    },
    features: {
      leads: false,
      sales_portal: false,
      whatsapp: false,
      advanced_reports: false,
      audit: false
    }
  },
  premium: {
    name: "Plano Premium",
    price: 9.90, // 🔧 EDITÁVEL
    limits: {
      vehicles: "unlimited",
      users: "unlimited",
      clients: "unlimited"
    },
    features: {
      leads: true,
      sales_portal: true,
      whatsapp: true,
      advanced_reports: true,
      audit: true
    }
  }
};

/* =========================
   DATABASE
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* =========================
   INIT DB
========================= */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL CHECK (plan IN ('trial','basic','premium')),
      status TEXT NOT NULL CHECK (status IN ('active','past_due','blocked')),
      current_period_end TIMESTAMP NOT NULL,
      mp_subscription_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("Tabela subscriptions pronta");
}

initDB();

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("AutoDriv Core OK");
});

/* =========================
   CREATE TRIAL (PRIMEIRO LOGIN)
========================= */
app.post("/create-trial", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email obrigatório" });

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + PLANS.trial.durationDays);

  await pool.query(
    `
    INSERT INTO subscriptions (email, plan, status, current_period_end)
    VALUES ($1,'trial','active',$2)
    ON CONFLICT (email) DO NOTHING
    `,
    [email, trialEnd]
  );

  res.json({
    success: true,
    trialEndsAt: trialEnd
  });
});

/* =========================
   WEBHOOK MERCADO PAGO
========================= */
app.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;
    if (!data?.id) return res.sendStatus(200);

    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${data.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }
    );

    const mpSub = await mpResponse.json();
    if (!mpSub.payer_email) return res.sendStatus(200);

    const email = mpSub.payer_email;

    const plan = mpSub.reason?.toLowerCase().includes("premium")
      ? "premium"
      : "basic";

    const status =
      mpSub.status === "authorized"
        ? "active"
        : "past_due";

    const currentPeriodEnd = new Date(mpSub.next_payment_date);

    await pool.query(
      `
      INSERT INTO subscriptions
        (email, plan, status, current_period_end, mp_subscription_id, updated_at)
      VALUES
        ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        mp_subscription_id = EXCLUDED.mp_subscription_id,
        updated_at = NOW()
      `,
      [email, plan, status, currentPeriodEnd, mpSub.id]
    );

    console.log("Assinatura atualizada:", email, plan, status);
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro webhook:", err);
    res.sendStatus(500);
  }
});

/* =========================
   ACCESS CHECK (APP / MOCHA)
========================= */
app.get("/access-check", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.json({ access: "blocked" });

  const result = await pool.query(
    `SELECT * FROM subscriptions WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return res.json({ access: "blocked" });
  }

  const sub = result.rows[0];
  const now = new Date();
  const planConfig = PLANS[sub.plan];

  let access = "full";

  if (now > new Date(sub.current_period_end)) {
    const diffDays =
      (now - new Date(sub.current_period_end)) / (1000 * 60 * 60 * 24);

    if (diffDays <= 2) {
      access = "payment_only";
      await pool.query(
        `UPDATE subscriptions SET status = 'past_due' WHERE email = $1`,
        [email]
      );
    } else {
      access = "blocked";
      await pool.query(
        `UPDATE subscriptions SET status = 'blocked' WHERE email = $1`,
        [email]
      );
    }
  }

  res.json({
    access,
    plan: sub.plan,
    limits: planConfig.limits,
    features: planConfig.features,
    prices: {
      basic: PLANS.basic.price,
      premium: PLANS.premium.price
    }
  });
});

/* =========================
   EMAIL REMINDERS (OPCIONAL)
========================= */
app.post("/cron/reminders", async (req, res) => {
  const now = new Date();

  const result = await pool.query(`
    SELECT email, current_period_end
    FROM subscriptions
    WHERE status IN ('active','past_due')
  `);

  for (const sub of result.rows) {
    const daysLeft = Math.ceil(
      (new Date(sub.current_period_end) - now) / (1000 * 60 * 60 * 24)
    );

    if ([7, 3, 0].includes(daysLeft)) {
      console.log(
        `Enviar e-mail lembrete (${daysLeft} dias) para ${sub.email}`
      );
      // 👉 integrar serviço de e-mail aqui (Sendgrid, Resend, etc.)
    }
  }

  res.json({ success: true });
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
