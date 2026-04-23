module.exports = {
  name: "028_contracts",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        dealership_id INTEGER NOT NULL REFERENCES dealerships(id),
        version INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_sale
      ON contracts(sale_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_dealership
      ON contracts(dealership_id);
    `);
  }
};
