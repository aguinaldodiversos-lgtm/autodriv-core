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
       USERS
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
       SUBSCRIPTIONS
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
       VEHICLES
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
       CLIENTS
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
       PROPOSALS
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
        client_id INT REFERENCES clients(id) ON DELETE SET NULL,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        price NUMERIC,
        status TEXT DEFAULT 'open',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* =========================
       SALES
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        proposal_id INT REFERENCES proposals(id) ON DELETE SET NULL,
        client_id INT REFERENCES clients(id) ON DELETE SET NULL,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        sold_by INT REFERENCES users(id) ON DELETE SET NULL,
        final_price NUMERIC NOT NULL,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* =========================
       FINANCIAL TRANSACTIONS
    ========================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('income','expense')),
        category TEXT,
        description TEXT,
        amount NUMERIC NOT NULL,
        due_date DATE,
        paid_date DATE,
        status TEXT DEFAULT 'pending',
        related_sale_id INT REFERENCES sales(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* =========================
       ÍNDICES
    ========================= */
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_dealership
      ON financial_transactions(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_dealership
      ON sales(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_proposals_dealership
      ON proposals(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_dealership
      ON leads(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_dealership
      ON clients(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_dealership
      ON vehicles(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_dealership
      ON users(dealership_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_dealership
      ON subscri
