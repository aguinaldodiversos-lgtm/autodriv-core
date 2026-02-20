module.exports = {
  name: "030_lead_conversations",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_conversations (
        id SERIAL PRIMARY KEY,
        dealership_id INTEGER NOT NULL,
        lead_id INTEGER NOT NULL,
        sender TEXT NOT NULL, -- 'client' | 'ai' | 'system'
        message TEXT NOT NULL,
        tokens INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),

        CONSTRAINT fk_lead
          FOREIGN KEY (lead_id)
          REFERENCES leads(id)
          ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_conversations_lead
      ON lead_conversations(lead_id);
    `);
  }
};
