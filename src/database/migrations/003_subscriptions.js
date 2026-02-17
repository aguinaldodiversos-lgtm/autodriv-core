module.exports = {
  name: "003_subscriptions",

  async up(pool) {
    // cria a tabela básica se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        plan TEXT,
        status TEXT,
        current_period_end TIMESTAMP,
        mp_subscription_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // adiciona a coluna dealership_id se não existir
    await pool.query(`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS dealership_id INT;
    `);

    // cria o índice (só funciona se a coluna existir)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_dealership
      ON subscriptions(dealership_id);
    `);
  }
};
