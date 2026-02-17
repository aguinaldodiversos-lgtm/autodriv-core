module.exports = {
  name: "008_sales",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        client_id INT REFERENCES clients(id) ON DELETE SET NULL,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
        proposal_id INT REFERENCES proposals(id) ON DELETE SET NULL,
        price NUMERIC NOT NULL,
        payment_method TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_dealership
      ON sales(dealership_id);
    `);
  }
};
