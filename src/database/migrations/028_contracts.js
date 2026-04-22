// Reescrita: versão anterior usava Knex, que não é dependência do projeto
// e nunca era executada pelo loader (quebrava com "knex is undefined"). Em
// produção a tabela existe porque foi criada à mão. Com o novo runner +
// schema_migrations + baseline, esta migration é idempotente em ambientes
// novos e no-op em produção (já marcada como aplicada na baseline).
module.exports = {
  name: "028_contracts",

  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
        dealership_id INTEGER REFERENCES dealerships(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        file_path TEXT,
        hash TEXT,
        observations TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_sale
      ON contracts(sale_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_dealership
      ON contracts(dealership_id);
    `);
  }
};
