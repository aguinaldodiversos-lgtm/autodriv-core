module.exports = {
  name: "037_followup_delivery_state",

  async up(pool) {
    await pool.query(`
      ALTER TABLE lead_followups
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
    `);

    await pool.query(`
      ALTER TABLE lead_followups
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
    `);

    await pool.query(`
      ALTER TABLE lead_followups
      ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
    `);

    await pool.query(`
      ALTER TABLE lead_followups
      ADD COLUMN IF NOT EXISTS last_error TEXT;
    `);

    await pool.query(`
      ALTER TABLE lead_followups
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_followups_due
      ON lead_followups (scheduled_at, id)
      WHERE sent_at IS NULL;
    `);
  }
};
