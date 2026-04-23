module.exports = {
  name: "036_leads_whatsapp_followups",

  async up(pool) {
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS name TEXT;
    `);
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `);
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS email TEXT;
    `);
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS ai_mode TEXT;
    `);
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS client_name TEXT;
    `);
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS client_phone TEXT;
    `);
    await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS origin TEXT;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_followups (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_followups_lead
      ON lead_followups (lead_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_followups_dealership
      ON lead_followups (dealership_id);
    `);
  }
};
