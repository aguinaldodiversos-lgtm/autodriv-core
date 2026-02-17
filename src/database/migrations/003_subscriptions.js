module.exports = {
  name: "003_subscriptions",

  async up(pool) {
    // cria a tabela se não existir
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

    // adiciona coluna dealership_id se não existir
    await pool.query(`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS dealership_id INT;
    `);

    // adiciona constraints corretas
    await pool.query(`
      ALTER TABLE subscriptions
      ADD CONSTRAINT IF NOT EXISTS fk_subscriptions_dealership
      FOREIGN KEY (dealership_id)
      REFERENCES dealerships(id)
      ON DELETE CASCADE;
    `);

    // cria índice somente depois da coluna existir
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_dealership
      ON subscriptions(dealership_id);
    `);
  }
};
