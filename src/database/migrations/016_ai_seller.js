module.exports = {
  name: "016_ai_seller",

  async up(pool) {
    /* =========================
       TABELA: lead_conversations
       Histórico das mensagens
    ========================== */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_conversations (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('client','ai','human')),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_conversations_lead
      ON lead_conversations(lead_id);
    `);

    /* =========================
       TABELA: lead_ai_state
       Estado da IA no funil
    ========================== */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_ai_state (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        lead_id INT UNIQUE REFERENCES leads(id) ON DELETE CASCADE,

        stage TEXT DEFAULT 'new'
        CHECK (stage IN (
          'new',
          'responded',
          'qualifying',
          'ready_for_visit',
          'visit_scheduled',
          'handoff_to_human'
        )),

        payment_type TEXT,
        has_trade_in BOOLEAN,
        visit_scheduled_at TIMESTAMP,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_ai_state_lead
      ON lead_ai_state(lead_id);
    `);
  }
};
