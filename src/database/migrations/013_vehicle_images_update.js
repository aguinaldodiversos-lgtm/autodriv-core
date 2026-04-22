module.exports = {
  name: "013_vehicle_images_update",

  async up(client) {
    await client.query(`
      ALTER TABLE vehicle_images
      ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
    `);

    await client.query(`
      ALTER TABLE vehicle_images
      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
    `);

    // Sincroniza is_main a partir de is_cover somente se is_cover existir.
    // Contexto histórico: o DB de prod (deploy original Feb-18) foi criado
    // por uma versão antiga do 013 que NÃO incluía is_cover na tabela.
    // A migration 005 (com is_cover) virou no-op em prod por causa do
    // CREATE TABLE IF NOT EXISTS. Sem esse guard, o UPDATE quebra o boot.
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'vehicle_images'
            AND column_name = 'is_cover'
        ) THEN
          UPDATE vehicle_images
          SET is_main = is_cover
          WHERE is_cover = true
            AND (is_main IS DISTINCT FROM is_cover);
        END IF;
      END $$;
    `);
  },
};
