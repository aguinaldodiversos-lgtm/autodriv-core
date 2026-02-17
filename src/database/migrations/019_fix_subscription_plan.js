module.exports = {
  name: "019_fix_subscription_plan",

  async up(pool) {
    // remove constraint antiga
    await pool.query(`
      ALTER TABLE subscriptions
      DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
    `);

    // cria nova constraint com trial
    await pool.query(`
      ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_plan_check
      CHECK (plan IN ('trial','starter','pro','master','basic','premium'));
    `);
  }
};
