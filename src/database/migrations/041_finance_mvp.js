module.exports = {
  name: "041_finance_mvp",

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
      ALTER TABLE finance_entries
      ADD COLUMN IF NOT EXISTS vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS related_sale_id INT REFERENCES sales(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS paid_by INT REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await pool.query(`
      UPDATE finance_entries
      SET status = 'pending'
      WHERE status IS NULL OR status = '';
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_entries_dealership_status_due
      ON finance_entries(dealership_id, status, due_date);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_entries_vehicle
      ON finance_entries(vehicle_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_entries_sale
      ON finance_entries(related_sale_id);
    `);
  }
};
