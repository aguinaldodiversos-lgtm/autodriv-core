module.exports = {
  name: "031_domain_events",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domain_events (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        tenant_id VARCHAR(50) NOT NULL,
        occurred_at TIMESTAMP NOT NULL
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_domain_events_tenant
      ON domain_events (tenant_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_domain_events_name
      ON domain_events (name);
    `);
  }
};
