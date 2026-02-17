module.exports = {
  name: "009_finance",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finance_entries (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('income','expense')),
        category TEXT,
        description TEXT,
        amount NUMERIC NOT NULL,
        due_date DATE,
        paid_date DATE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_dealership
      ON finance_entries(dealership_id);
    `);
  }
};
