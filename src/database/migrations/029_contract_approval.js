// Reescrita: versão anterior usava Knex (inexecutável). Mantém o nome
// original para que ambientes onde ela já rodou à mão sejam compatíveis
// quando marcados na baseline do schema_migrations.
module.exports = {
  name: "029_contract_approval",

  async up(client) {
    await client.query(`
      ALTER TABLE contracts
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
        ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_status
      ON contracts(dealership_id, status);
    `);
  }
};
