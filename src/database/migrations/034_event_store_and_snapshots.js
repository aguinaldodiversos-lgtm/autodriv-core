module.exports = {
  name: "034_event_store_and_snapshots",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_store (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        event_name VARCHAR(200),
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        aggregate_id TEXT,
        aggregate_type TEXT,
        version INTEGER
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_store_tenant
      ON event_store (tenant_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_store_aggregate
      ON event_store (aggregate_id, version);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id UUID PRIMARY KEY,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS revenue_snapshots (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        vehicle_score NUMERIC,
        lead_score NUMERIC,
        channel_score NUMERIC,
        global_health NUMERIC,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_revenue_snapshots_tenant
      ON revenue_snapshots (tenant_id);
    `);
  }
};
