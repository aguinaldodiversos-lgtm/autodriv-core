// Migration corretiva: reconcilia colunas que o código de produção presume
// existirem na tabela `leads` (`client_name`, `client_phone`, `origin`,
// `updated_at`, `score`, `priority_score`, `payment_type`) mas que a migration
// 006_leads.js nunca criou. Em ambientes onde essas colunas foram adicionadas
// manualmente fora do sistema de migrations, o IF NOT EXISTS torna este
// script seguro de re-executar.
module.exports = {
  name: "032_leads_contact_fields",

  async up(pool) {
    await pool.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS client_name TEXT,
        ADD COLUMN IF NOT EXISTS client_phone TEXT,
        ADD COLUMN IF NOT EXISTS origin TEXT,
        ADD COLUMN IF NOT EXISTS score INT,
        ADD COLUMN IF NOT EXISTS priority_score INT,
        ADD COLUMN IF NOT EXISTS payment_type TEXT;
    `);

    // updated_at é esperado por vários UPDATEs; default garante backfill automático.
    await pool.query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_client_phone
      ON leads(dealership_id, client_phone);
    `);
  }
};
