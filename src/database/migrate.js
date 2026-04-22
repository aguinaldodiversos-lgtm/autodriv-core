const fs = require("fs");
const path = require("path");

const pool = require("../config/db");
const logger = require("../infrastructure/logger/logger");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Migrations consideradas aplicadas em bancos legados (criados antes da
// introdução de `schema_migrations`). Ao detectar um DB em uso sem a tabela
// de controle, o runner marca APENAS estas como aplicadas — qualquer
// migration nova (ex.: 033+) roda normalmente mesmo em ambientes antigos.
const LEGACY_BASELINE = new Set([
  "001_dealerships",
  "002_users",
  "003_subscriptions",
  "004_vehicles",
  "005_clients",
  "005_vehicle_images",
  "006_leads",
  "007_proposals",
  "008_sales",
  "009_finance",
  "010_maintenance",
  "011_ads",
  "012_public_slug",
  "013_vehicle_images_update",
  "014_vehicle_seo",
  "015_integrations",
  "016_ai_seller",
  "017_tasks",
  "018_ai_settings",
  "019_fix_subscription_plan",
  "020_normalize_subscriptions",
  "021_lead_profile_fields",
  "022_lead_score",
  "023_vehicle_entry_date",
  "024_vehicle_featured",
  "024_vehicle_fipe",
  "025_tasks_ai",
  "026_whatsapp_instances",
  "027_whatsapp_update",
  "028_contracts",
  "029_contract_approval",
  "030_lead_conversations",
  "031_domain_evets",
  "032_leads_contact_fields"
]);

/**
 * Garante a tabela de controle `schema_migrations`.
 * Retorna `true` se a tabela foi criada agora, `false` se já existia.
 */
async function ensureSchemaMigrationsTable(client) {
  const existed = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'schema_migrations'`
  );

  if (existed.rows.length > 0) return false;

  await client.query(`
    CREATE TABLE schema_migrations (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  return true;
}

/**
 * Heurística: se já existem tabelas de domínio (dealerships), o banco está
 * em uso — consideramos que as migrations pré-existentes já rodaram em algum
 * momento (via loader antigo ou à mão). Nesse caso, gravamos todas como
 * baseline ao invés de tentar reexecutá-las, já que parte delas não é
 * idempotente.
 */
async function isLegacyDatabase(client) {
  const r = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'dealerships'`
  );
  return r.rows.length > 0;
}

/**
 * Lista migrations em ordem alfanumérica estável.
 * Aceita `.js` e `.sql`. Arquivos que não batem são ignorados.
 */
function listMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  return files
    .filter((f) => f.isFile())
    .map((f) => f.name)
    .filter((n) => n.endsWith(".js") || n.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Deriva o nome lógico (sem extensão) que vai para `schema_migrations`.
 * Para `.js`, preserva `module.exports.name` quando existir; para `.sql`,
 * usa o nome do arquivo sem extensão.
 */
function resolveMigrationName(file) {
  if (file.endsWith(".sql")) {
    return file.replace(/\.sql$/, "");
  }
  const mod = require(path.join(MIGRATIONS_DIR, file));
  return mod.name || file.replace(/\.js$/, "");
}

async function isAlreadyApplied(client, name) {
  const r = await client.query(
    `SELECT 1 FROM schema_migrations WHERE name = $1`,
    [name]
  );
  return r.rows.length > 0;
}

async function recordMigration(client, name) {
  await client.query(
    `INSERT INTO schema_migrations (name) VALUES ($1)
     ON CONFLICT (name) DO NOTHING`,
    [name]
  );
}

async function runSingleMigration(client, file, name) {
  const fullPath = path.join(MIGRATIONS_DIR, file);

  if (file.endsWith(".sql")) {
    const sql = fs.readFileSync(fullPath, "utf8");
    await client.query(sql);
    return;
  }

  const mod = require(fullPath);

  if (!mod || typeof mod.up !== "function") {
    throw new Error(
      `[migrations] Migration inválida em '${file}' (export up() ausente)`
    );
  }

  await mod.up(client);
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    const created = await ensureSchemaMigrationsTable(client);
    const files = listMigrationFiles();

    if (created && (await isLegacyDatabase(client))) {
      let marked = 0;
      for (const file of files) {
        const name = resolveMigrationName(file);
        if (LEGACY_BASELINE.has(name)) {
          await recordMigration(client, name);
          marked++;
        }
      }
      logger.warn(
        { marked, total: files.length },
        "schema_migrations recém-criada em DB legado — baseline aplicada"
      );
      // Continua para rodar migrations novas (fora da baseline).
    }

    let ran = 0;
    let skipped = 0;

    for (const file of files) {
      const name = resolveMigrationName(file);

      if (await isAlreadyApplied(client, name)) {
        skipped++;
        continue;
      }

      logger.info({ name, file }, "aplicando migration");

      try {
        await client.query("BEGIN");
        await runSingleMigration(client, file, name);
        await recordMigration(client, name);
        await client.query("COMMIT");
        ran++;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        logger.error({ name, file, err }, "falha na migration");
        throw err;
      }
    }

    logger.info(
      { ran, skipped, total: files.length },
      "migrations concluídas"
    );
  } finally {
    client.release();
  }
}

module.exports = runMigrations;
