const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const { getDefaultQueue } = require("../../infrastructure/jobs/default.queue");

router.post("/queue/ping", async (req, res) => {
  try {
    const q = getDefaultQueue();
    if (!q) {
      return res
        .status(503)
        .json({ error: "Redis não configurado (REDIS_URL)" });
    }
    const job = await q.add("ping", { at: Date.now() });
    res.json({ ok: true, jobId: job.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao enfileirar" });
  }
});

router.post("/create-trial", async (req, res) => {
  try {
    const { dealership_id, email } = req.body;

    if (!dealership_id || !email) {
      return res.status(400).json({
        error: "dealership_id e email são obrigatórios"
      });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await pool.query(
      `
      INSERT INTO subscriptions
      (dealership_id, plan, status, current_period_end)
      VALUES ($1,'trial','active',$2)
      ON CONFLICT (dealership_id) DO NOTHING
      `,
      [dealership_id, trialEnd]
    );

    res.json({
      success: true,
      message: "Trial criado com sucesso"
    });
  } catch (err) {
    console.error("Erro ao criar trial:", err);
    res.status(500).json({ error: "Erro ao criar trial" });
  }
});

module.exports = router;
