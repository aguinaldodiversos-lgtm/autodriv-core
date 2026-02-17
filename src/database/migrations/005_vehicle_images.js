module.exports = {
  name: "005_vehicle_images",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_images (
        id SERIAL PRIMARY KEY,
        dealership_id INT
          REFERENCES dealerships(id)
          ON DELETE CASCADE,

        vehicle_id INT
          REFERENCES vehicles(id)
          ON DELETE CASCADE,

        image_url TEXT NOT NULL,
        is_cover BOOLEAN DEFAULT false,

        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle
      ON vehicle_images(vehicle_id);
    `);
  }
};
