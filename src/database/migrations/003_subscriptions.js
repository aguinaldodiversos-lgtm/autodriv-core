module.exports = {
  name: "003_subscriptions",

  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        dealership_id INT UNIQUE REFERENCES dealerships(id) ON DELETE CASCADE,
        plan TEXT NOT NULL CHECK (plan IN ('starter','pro','master')),
        status TEXT NOT NULL CHECK (status IN ('active','past_due','blocked')),
        current_period_end TIMESTAMP NOT NULL,
        mp_subscription_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_dealership
      ON subscriptions(dealership_id);
    `);
  }
};
