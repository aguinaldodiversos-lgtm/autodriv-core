module.exports = {
  name: "020_normalize_subscriptions",

  async up(pool) {
    // garante coluna dealership_id
    await pool.query(`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS dealership_id INT;
    `);

    // remove assinaturas sem loja
    await pool.query(`
      DELETE FROM subscriptions
      WHERE dealership_id IS NULL;
    `);

    // define plan padrão
    await pool.query(`
      ALTER TABLE subscriptions
      ALTER COLUMN plan SET DEFAULT 'trial';
    `);

    // define status padrão
    await pool.query(`
      ALTER TABLE subscriptions
      ALTER COLUMN status SET DEFAULT 'active';
    `);

    // cria índice único por loja
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'subscriptions_dealership_unique'
        ) THEN
          ALTER TABLE subscriptions
          ADD CONSTRAINT subscriptions_dealership_unique
          UNIQUE (dealership_id);
        END IF;
      END$$;
    `);
  }
};
