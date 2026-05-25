module.exports = {
  name: "043_vehicle_intake_details",

  async up(pool) {
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS license_plate TEXT,
      ADD COLUMN IF NOT EXISTS version TEXT,
      ADD COLUMN IF NOT EXISTS color TEXT,
      ADD COLUMN IF NOT EXISTS fuel TEXT,
      ADD COLUMN IF NOT EXISTS transmission TEXT,
      ADD COLUMN IF NOT EXISTS mileage INT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS repair_notes TEXT,
      ADD COLUMN IF NOT EXISTS preparation_items JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);

    await pool.query(`
      ALTER TABLE vehicle_images
      ADD COLUMN IF NOT EXISTS dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS label TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    await pool.query(`
      UPDATE vehicle_images vi
      SET dealership_id = v.dealership_id
      FROM vehicles v
      WHERE vi.vehicle_id = v.id
        AND vi.dealership_id IS NULL;
    `);

    await pool.query(`
      DELETE FROM vehicle_images a
      USING vehicle_images b
      WHERE a.vehicle_id = b.vehicle_id
        AND a.image_url = b.image_url
        AND a.id > b.id;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_url
      ON vehicle_images(vehicle_id, image_url);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_plate
      ON vehicles(dealership_id, license_plate);
    `);
  }
};
