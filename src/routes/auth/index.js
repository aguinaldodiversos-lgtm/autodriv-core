const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const bcrypt = require("bcryptjs");

const router = express.Router();

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

    // Credenciais genéricas para evitar enumeração de usuários.
    const invalid = () =>
      res.status(401).json({ error: "Credenciais inválidas" });

    if (!user) return invalid();

    const valid = await bcrypt.compare(password, user.password_hash || "");
    if (!valid) return invalid();

    const token = jwt.sign(
      {
        id: user.id,
        user_id: user.id,
        dealership_id: user.dealership_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d", algorithm: "HS256" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro no login" });
  }
});

module.exports = router;
