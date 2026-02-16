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
        current_period_end TIMESTAMP NOT NULL,
        mp_subscription_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* =========================
       VEHICLES (VEÍCULOS)
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        year INT,
        price NUMERIC,
        status TEXT DEFAULT 'available',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* =========================
       CLIENTS (CLIENTES)
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        cpf_cnpj TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  /* =========================
       LEADS
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        client_id INT REFERENCES clients(id) ON DELETE SET NULL,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL,
        source TEXT,
        status TEXT DEFAULT 'new',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* =========================
       ÍNDICES DE PERFORMANCE
    ========================= */
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_dealership
      ON users(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_dealership
      ON vehicles(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_dealership
      ON clients(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_dealership
      ON subscriptions(dealership_id);
    `);

    console.log("Banco inicializado com sucesso");
  } catch (err) {
    console.error("Erro ao inicializar banco:", err);
    process.exit(1);
  }
}

module.exports = initDB;
