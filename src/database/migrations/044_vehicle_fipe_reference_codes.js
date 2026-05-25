module.exports = {
  name: "044_vehicle_fipe_reference_codes",

  async up(pool) {
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS fipe_brand_code TEXT,
      ADD COLUMN IF NOT EXISTS fipe_model_code TEXT,
      ADD COLUMN IF NOT EXISTS fipe_year_code TEXT,
      ADD COLUMN IF NOT EXISTS fipe_code TEXT,
      ADD COLUMN IF NOT EXISTS fipe_reference_month TEXT;
    `);
  }
};
