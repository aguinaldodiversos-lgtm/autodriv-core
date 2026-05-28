/**
 * Lista canónica e determinística de migrations (ordem = ordem de execução).
 * Cada ficheiro em `migrations/<name>.js` exporta `{ name, up(client) }` com o mesmo `name`.
 */
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
  require("./migrations/037_followup_delivery_state"),
  require("./migrations/038_intelligence_actions"),
  require("./migrations/039_operational_crm"),
  require("./migrations/040_intelligence_action_outcomes"),
  require("./migrations/041_finance_mvp"),
  require("./migrations/042_intelligence_priority_impact"),
  require("./migrations/043_vehicle_intake_details"),
  require("./migrations/044_vehicle_fipe_reference_codes"),
  require("./migrations/045_ads_preparation_metadata"),
  require("./migrations/046_billing_mercado_pago"),
  require("./migrations/047_whatsapp_ai_pre_attendance"),
  require("./migrations/048_seller_action_outcomes"),
  require("./migrations/049_ad_preparation_module"),
];

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

function resolveMigrationFilePath(migrationName) {
  return path.join(__dirname, "migrations", `${migrationName}.js`);
}

function assertMigrationFileExists(migrationName) {
  const p = resolveMigrationFilePath(migrationName);
  if (!fs.existsSync(p)) {
    throw new Error(
      `[migrations] Ficheiro em falta para a migration \"${migrationName}\": ${p}`
    );
  }
  return p;
}

function computeMigrationChecksum(absoluteFilePath) {
  const buf = fs.readFileSync(absoluteFilePath);
  const normalized = buf.toString("utf8").replace(/\r\n/g, "\n");
  return crypto
    .createHash("sha256")
    .update(normalized, "utf8")
    .digest("hex");
}

function computeChecksumForName(migrationName) {
  const p = assertMigrationFileExists(migrationName);
  return computeMigrationChecksum(p);
}

module.exports = {
  MIGRATIONS: migrations,
  resolveMigrationFilePath,
  assertMigrationFileExists,
  computeMigrationChecksum,
  computeChecksumForName,
};
