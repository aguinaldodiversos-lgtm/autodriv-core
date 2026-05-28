module.exports = {
  name: "048_seller_action_outcomes",

  async up(pool) {
    await pool.query(`
      ALTER TABLE seller_actions
      ADD COLUMN IF NOT EXISTS claimed_by INT REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS outcome_type TEXT,
      ADD COLUMN IF NOT EXISTS outcome_value NUMERIC,
      ADD COLUMN IF NOT EXISTS outcome_note TEXT;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_seller_actions_claimed_by
      ON seller_actions (dealership_id, claimed_by, status, due_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_seller_actions_source_created
      ON seller_actions (dealership_id, source, created_at DESC);
    `);
  }
};
