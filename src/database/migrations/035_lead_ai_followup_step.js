module.exports = {
  name: "035_lead_ai_followup_step",

  async up(pool) {
    await pool.query(`
      ALTER TABLE lead_ai_state
      ADD COLUMN IF NOT EXISTS followup_step INTEGER DEFAULT 0;
    `);
  }
};
