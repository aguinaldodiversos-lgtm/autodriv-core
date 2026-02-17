module.exports = {
  name: "017_tasks",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        dealership_id INT REFERENCES dealerships(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        lead_id INT REFERENCES leads(id) ON DELETE CASCADE,

        type TEXT,
        title TEXT,
        description TEXT,

        status TEXT DEFAULT 'pending',
        due_at TIMESTAMP,

        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_dealership
      ON tasks(dealership_id);
    `);
  }
};
