module.exports = {
  name: "042_intelligence_priority_impact",

  async up(pool) {
    await pool.query(`
      ALTER TABLE intelligence_actions
      ADD COLUMN IF NOT EXISTS impact_area TEXT,
      ADD COLUMN IF NOT EXISTS impact_label TEXT,
      ADD COLUMN IF NOT EXISTS impact_estimate NUMERIC,
      ADD COLUMN IF NOT EXISTS urgency_label TEXT,
      ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
      ADD COLUMN IF NOT EXISTS recommended_channel TEXT;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_intelligence_actions_impact_area
      ON intelligence_actions (dealership_id, impact_area, status, priority_score DESC);
    `);
  }
};
