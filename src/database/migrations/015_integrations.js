module.exports = {
  name: "015_integrations",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_integrations (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        external_id TEXT,
        status TEXT DEFAULT 'pending',
        last_sync TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_integrations_vehicle
      ON vehicle_integrations(vehicle_id);
    `);
  }
};
