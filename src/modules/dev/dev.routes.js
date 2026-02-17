const express = require("express");
const router = express.Router();
const pool = require("../../config/db");

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
      (dealership_id, email, plan, status, current_period_end)
      VALUES ($1,$2,'trial','active',$3)
      ON CONFLICT DO NOTHING
      `,
      [dealership_id, email, trialEnd]
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
