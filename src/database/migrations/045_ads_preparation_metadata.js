module.exports = {
  name: "045_ads_preparation_metadata",

  async up(pool) {
    await pool.query(`
      ALTER TABLE ads
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ads_vehicle_platform_status
      ON ads(vehicle_id, platform, status);
    `);
  }
};
