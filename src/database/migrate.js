const pool = require("../config/db");

async function runMigrations() {
  const migrations = [
    require("./migrations/001_dealerships"),
    require("./migrations/002_users"),
    require("./migrations/003_subscriptions"),
    require("./migrations/004_vehicles"),
    require("./migrations/005_vehicle_images"),
    require("./migrations/006_clients"),
    require("./migrations/007_leads"),
    require("./migrations/008_proposals"),
    require("./migrations/009_sales"),
    require("./migrations/010_finance"),
    require("./migrations/011_maintenance"),
    require("./migrations/012_vehicle_seo"),
    require("./migrations/013_ads"),
    require("./migrations/014_public_catalog"),
    require("./migrations/015_integrations"),
    require("./migrations/016_ai_seller"),
    require("./migrations/017_tasks"),
    require("./migrations/018_ai_settings")
  ];

  for (const migration of migrations) {
    try {
      console.log(`Rodando migration: ${migration.name}`);
      await migration.up(pool);
    } catch (err) {
      console.error("Erro nas migrations:", err);
      process.exit(1);
    }
  }

  console.log("Migrations concluídas.");
}

module.exports = runMigrations;
