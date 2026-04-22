module.exports = {
  name: "033_seo_keywords",

  async up(pool) {
    // Adiciona keywords e schema JSON-LD na tabela vehicles
    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
    `);

    await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS seo_schema JSONB;
    `);

    // Índice parcial para auditoria rápida (veículos sem SEO)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_missing_seo
      ON vehicles(dealership_id)
      WHERE seo_title IS NULL AND status = 'available';
    `);
  }
};
