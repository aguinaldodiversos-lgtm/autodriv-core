module.exports = {
  name: "007_proposals",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        client_id INT REFERENCES clients(id) ON DELETE SET NULL,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
        price NUMERIC,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_proposals_dealership
      ON proposals(dealership_id);
    `);
  }
};
