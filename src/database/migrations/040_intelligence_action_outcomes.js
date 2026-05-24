module.exports = {
  name: "040_intelligence_action_outcomes",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intelligence_action_outcomes (
        id SERIAL PRIMARY KEY,
        action_id INT NOT NULL REFERENCES intelligence_actions(id) ON DELETE CASCADE,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        recorded_by INT REFERENCES users(id) ON DELETE SET NULL,
        outcome_type TEXT NOT NULL
          CHECK (outcome_type IN ('sale', 'reply', 'proposal', 'appointment', 'repurchase', 'no_result')),
        outcome_value NUMERIC,
        notes TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (action_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_intelligence_action_outcomes_dealership
      ON intelligence_action_outcomes (dealership_id, outcome_type, occurred_at DESC);
    `);
  }
};
