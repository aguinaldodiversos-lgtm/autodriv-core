module.exports = {
  name: "011_ads",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
        title TEXT,
        description TEXT,
        platform TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ads_dealership
      ON ads(dealership_id);
    `);
  }
};
