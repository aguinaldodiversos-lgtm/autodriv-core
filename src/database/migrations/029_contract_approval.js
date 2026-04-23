module.exports = {
  name: "029_contract_approval",

  async up(pool) {
    await pool.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
    `);

    await pool.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
    `);

    await pool.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
    `);

    await pool.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    await pool.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS observations TEXT;
    `);

    await pool.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
  }
};
