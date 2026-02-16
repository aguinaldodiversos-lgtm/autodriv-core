module.exports = {
  name: "006_leads",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        client_id INT REFERENCES clients(id) ON DELETE SET NULL,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL,
        source TEXT,
        status TEXT DEFAULT 'new',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_dealership
      ON leads(dealership_id);
    `);
  }
};
