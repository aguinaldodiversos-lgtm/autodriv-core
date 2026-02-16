const pool = require("../config/db");

async function initDB() {
  try {
    /* =========================
       DEALERSHIPS (LOJAS)
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dealerships (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* =========================
       USERS (USUÁRIOS DA LOJA)
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','manager','seller','maintenance')),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* =========================
       SUBSCRIPTIONS (PLANOS)
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        dealership_id INT UNIQUE REFERENCES dealerships(id) ON DELETE CASCADE,
        plan TEXT NOT NULL CHECK (plan IN ('starter','pro','master')),
        status TEXT NOT NULL CHECK (status IN ('active','past_due','blocked')),
        current_peri_
