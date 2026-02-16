module.exports = {
  name: "012_public_slug",

  async up(pool) {
    await pool.query(`
      ALTER TABLE dealerships
      ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
    `);

    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS slug TEXT;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dealership_slug
      ON dealerships(slug);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_slug
      ON vehicles(slug);
    `);
  }
};
