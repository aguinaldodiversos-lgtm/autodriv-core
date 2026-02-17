module.exports = {
  name: "024_vehicle_fipe",

  async up(pool) {
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS fipe_price NUMERIC;
    `);
  }
};
