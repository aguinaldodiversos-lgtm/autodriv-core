module.exports = {
  name: "032_leads_score_columns",

  async up(pool) {
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
    `);
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS priority_score INTEGER;
    `);
  }
};
