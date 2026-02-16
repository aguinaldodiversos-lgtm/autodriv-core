module.exports = {
  name: "014_vehicle_seo",

  async up(pool) {
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS seo_title TEXT;
    `);

    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS seo_description TEXT;
    `);
  }
};
