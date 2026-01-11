const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.post("/webhook", async (req, res) => {
  const data = req.body;
  console.log("Webhook recebido:", data);

  if (data.type === "payment" || data.action?.includes("payment")) {
    const email = data.data?.payer?.email;

    if (email) {
      await pool.query(
        "UPDATE users SET active = true WHERE email = $1",
        [email]
      );
    }
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => res.send("AutoDriv Core OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando"));
