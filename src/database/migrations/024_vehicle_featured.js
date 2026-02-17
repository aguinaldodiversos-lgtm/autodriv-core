module.exports = {
  name: "024_vehicle_featured",

  async up(pool) {
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    `);
  }
};
