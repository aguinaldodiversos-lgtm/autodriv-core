module.exports = {
  name: "013_vehicle_images",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_images (
        id SERIAL PRIMARY KEY,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_main BOOLEAN DEFAULT false,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle
      ON vehicle_images(vehicle_id);
    `);
  }
};
