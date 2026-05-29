module.exports = {
  name: "050_external_publication_channels",

  async up(pool) {
    await pool.query(`
      ALTER TABLE vehicle_integrations
      ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS status_detail TEXT,
      ADD COLUMN IF NOT EXISTS external_url TEXT,
      ADD COLUMN IF NOT EXISTS last_error TEXT,
      ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_integrations_channel_status
      ON vehicle_integrations(dealership_id, vehicle_id, platform, status, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_integrations_errors
      ON vehicle_integrations(dealership_id, platform, status, last_error_at DESC)
      WHERE status IN ('failed', 'blocked');
    `);
  }
};
