const pool = require("../config/db");

async function runMigrations() {
  const migrations = [
    require("./migrations/001_dealerships"),
    require("./migrations/002_users"),
    require("./migrations/003_subscriptions"),
    require("./migrations/004_vehicles"),

    // ordem real dos arquivos
    require("./migrations/005_vehicle_images"),
    require("./migrations/005_clients"),

    require("./migrations/006_leads"),
    require("./migrations/007_proposals"),
    require("./migrations/008_sales"),
    require("./migrations/009_finance"),
    require("./migrations/010_maintenance"),
    require("./migrations/011_ads"),
    require("./migrations/012_public_slug"),
    require("./migrations/013_vehicle_images"),
    require("./migrations/014_vehicle_seo"),
    require("./migrations/015_integrations"),
    require("./migrations/016_ai_seller"),
    require("./migrations/017_tasks"),
    require("./migrations/018_ai_settings")
    require("./migrations/019_fix_subscription_plan"),

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
