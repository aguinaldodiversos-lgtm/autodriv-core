module.exports = {
  name: "033_sales_approval",

  async up(pool) {
    await pool.query(`
      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
    `);
    await pool.query(`
      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
    `);
    await pool.query(`
      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
    `);
    await pool.query(`
      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
    `);
    await pool.query(`
      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_approval_history (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        performed_by INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_approval_history_sale
      ON sales_approval_history(sale_id);
    `);
  }
};
