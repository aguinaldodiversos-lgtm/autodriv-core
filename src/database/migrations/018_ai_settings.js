module.exports = {
  name: "018_ai_settings",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_settings (
        id SERIAL PRIMARY KEY,
        dealership_id INT UNIQUE
          REFERENCES dealerships(id)
          ON DELETE CASCADE,

        ai_enabled BOOLEAN DEFAULT true,

        working_hours_start TIME DEFAULT '08:00',
        working_hours_end TIME DEFAULT '18:00',

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }
};
