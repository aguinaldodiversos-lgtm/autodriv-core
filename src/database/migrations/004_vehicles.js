module.exports = {
  name: "004_vehicles",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        year INT,
        price NUMERIC,
        status TEXT DEFAULT 'available',
        documentation_status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_dealership
      ON vehicles(dealership_id);
    `);
  }
};
