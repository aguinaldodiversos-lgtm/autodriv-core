module.exports = {
  name: "013_vehicle_images_update",

  async up(pool) {
    // Adicionar coluna is_main se não existir
    await pool.query(`
      ALTER TABLE vehicle_images
      ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
    `);

    // Adicionar coluna sort_order se não existir
    await pool.query(`
      ALTER TABLE vehicle_images
      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
    `);

    // Se quiser manter compatibilidade:
    // Sincronizar is_cover com is_main
    await pool.query(`
      UPDATE vehicle_images
      SET is_main = is_cover
      WHERE is_cover = true;
    `);
  }
};
