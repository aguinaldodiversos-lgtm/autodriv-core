module.exports = {
  name: "052_vehicle_operational_panel",

  async up(pool) {
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS sold_price NUMERIC,
      ADD COLUMN IF NOT EXISTS sold_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS sale_status TEXT DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS sale_notes TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_operational_status
      ON vehicles (dealership_id, status, ad_status, preparation_status, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_operational_sold
      ON vehicles (dealership_id, sold_at DESC)
      WHERE sold_at IS NOT NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_images_main
      ON vehicle_images (dealership_id, vehicle_id, is_main DESC, is_cover DESC, sort_order ASC);
    `);
  }
};
