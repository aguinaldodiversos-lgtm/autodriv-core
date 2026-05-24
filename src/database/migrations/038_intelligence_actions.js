module.exports = {
  name: "038_intelligence_actions",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intelligence_actions (
        id SERIAL PRIMARY KEY,
        dealership_id INT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
        action_key TEXT NOT NULL,
        type TEXT NOT NULL,
        entity_type TEXT,
        entity_id INT,
        priority_score INT NOT NULL DEFAULT 0,
        priority_label TEXT NOT NULL DEFAULT 'medium',
        reason TEXT NOT NULL,
        suggested_action TEXT NOT NULL,
        evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
        explanation TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'accepted', 'ignored')),
        decided_by INT REFERENCES users(id) ON DELETE SET NULL,
        decided_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (dealership_id, action_key)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_intelligence_actions_dealership_status
      ON intelligence_actions (dealership_id, status, priority_score DESC);
    `);
  }
};
