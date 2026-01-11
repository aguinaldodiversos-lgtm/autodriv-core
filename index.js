const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

app.get("/", (req, res) => {
  res.send("AutoDriv Core OK");
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
