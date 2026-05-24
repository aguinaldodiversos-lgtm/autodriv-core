module.exports = {
  name: "021_lead_profile_fields",

  async up(client) {
    await client.query(`
      ALTER TABLE lead_ai_state
      ADD COLUMN IF NOT EXISTS client_name TEXT,
      ADD COLUMN IF NOT EXISTS usage_profile TEXT,
      ADD COLUMN IF NOT EXISTS budget_range TEXT,
      ADD COLUMN IF NOT EXISTS purchase_timeline TEXT;
    `);
  }
};
