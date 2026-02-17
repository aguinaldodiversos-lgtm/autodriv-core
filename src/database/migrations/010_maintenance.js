module.exports = {
  name: "010_maintenance",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_orders (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_tasks (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES maintenance_orders(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'pending'
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_maintenance_orders_vehicle
      ON maintenance_orders(vehicle_id);
    `);
  }
};
