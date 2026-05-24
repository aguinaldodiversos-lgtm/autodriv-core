module.exports = {
  name: "025_tasks_ai",

  async up(client) {
    await client.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS lead_id INTEGER,
      ADD COLUMN IF NOT EXISTS type TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

      CREATE INDEX IF NOT EXISTS idx_tasks_lead
      ON tasks (lead_id);
    `);
  }
};
