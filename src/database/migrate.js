const pool = require("../config/db");

const migrations = [
  require("./migrations/001_dealerships"),
  require("./migrations/002_users"),
  require("./migrations/003_subscriptions"),
  require("./migrations/004_vehicles"),
  require("./migrations/005_clients"),
  require("./migrations/005_vehicle_images"),
  require("./migrations/006_leads"),
  require("./migrations/007_proposals"),
  require("./migrations/008_sales"),
  require("./migrations/009_finance"),
  require("./migrations/010_maintenance"),
  require("./migrations/011_ads"),
  require("./migrations/012_public_slug"),
  require("./migrations/013_vehicle_images_update"),
  require("./migrations/014_vehicle_seo"),
  require("./migrations/015_integrations"),
  require("./migrations/016_ai_seller"),
  require("./migrations/017_tasks"),
  require("./migrations/018_ai_settings"),
  require("./migrations/019_fix_subscription_plan"),
  require("./migrations/020_normalize_subscriptions"),
  require("./migrations/021_lead_profile_fields"),
  require("./migrations/022_lead_score"),
  require("./migrations/023_vehicle_entry_date"),
  require("./migrations/024_vehicle_fipe"),
  require("./migrations/024_vehicle_featured"),
  require("./migrations/025_tasks_ai"),
  require("./migrations/026_whatsapp_instances"),
  require("./migrations/027_whatsapp_update"),
  require("./migrations/028_contracts"),
  require("./migrations/029_contract_approval"),
  require("./migrations/030_lead_conversations"),
  require("./migrations/031_domain_events"),
  require("./migrations/032_leads_score_columns"),
  require("./migrations/033_sales_approval"),
  require("./migrations/034_event_store_and_snapshots"),
  require("./migrations/035_lead_ai_followup_step"),
  require("./migrations/036_leads_whatsapp_followups"),
];

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log(`[migrations] Iniciando execução de ${migrations.length} migrations...`);

    for (const migration of migrations) {
      if (!migration || typeof migration.up !== "function") {
        throw new Error(
          `[migrations] Migration inválida detectada: ${migration?.name || "sem nome"}`
        );
      }

      const migrationName = migration.name || "migration_sem_nome";
      console.log(`[migrations] Rodando: ${migrationName}`);

      await migration.up(client);

      console.log(`[migrations] Concluída: ${migrationName}`);
    }

    console.log("[migrations] Todas as migrations foram concluídas com sucesso.");
  } catch (err) {
    console.error("[migrations] Erro durante a execução:", err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = runMigrations;
