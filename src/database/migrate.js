const pool = require("../config/db");

async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const { rows } = await pool.query(`SELECT name FROM migrations`);
    const executed = rows.map(r => r.name);

    const migrations = [
      require("./migrations/001_dealerships"),
      require("./migrations/002_users"),
      require("./migrations/003_subscriptions"),
      require("./migrations/004_vehicles"),
      require("./migrations/005_clients"),
      require("./migrations/006_leads"),
      require("./migrations/007_proposals"),
      require("./migrations/008_sales"),
      require("./migrations/009_finance"),
      require("./migrations/010_maintenance"),
      require("./migrations/011_ads"),
      require("./migrations/012_public_slug"),
      require("./migrations/013_vehicle_images")
    ];

    for (const migration of migrations) {
      if (!executed.includes(migration.name)) {
        console.log("Rodando migration:", migration.name);
        await migration.up(pool);

        await pool.query(
          `INSERT INTO migrations (name) VALUES ($1)`,
          [migration.name]
        );
      }
    }

    console.log("Migrations concluídas");
  } catch (err) {
    console.error("Erro nas migrations:", err);
    process.exit(1);
  }
}

module.exports = runMigrations;
