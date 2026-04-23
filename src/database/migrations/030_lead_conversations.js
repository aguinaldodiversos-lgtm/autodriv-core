module.exports = {
  name: "030_lead_conversations",

  async up(pool) {
    /* Tabela base e coluna "role" vêm de 016_ai_seller; aqui só estendemos o schema. */
    await pool.query(`
      ALTER TABLE lead_conversations
      ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 0;
    `);
  }
};
