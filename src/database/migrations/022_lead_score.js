module.exports = {
  name: "022_lead_score",

  async up(client) {
    await client.query(`
      ALTER TABLE lead_ai_state
      ADD COLUMN IF NOT EXISTS lead_score TEXT DEFAULT 'cold';
    `);
  }
};
