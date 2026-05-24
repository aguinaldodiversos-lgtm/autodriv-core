const pool = require("../config/db");
const { MIGRATIONS } = require("./migrationManifest");
const { runPendingMigrations } = require("./migrationRunnerCore");

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log(
      `[migrations] Iniciando (ledger schema_migrations; ${MIGRATIONS.length} ficheiros no manifest)...`
    );
    const result = await runPendingMigrations(client, { migrations: MIGRATIONS, log: console });
    if (result.applied.length || result.skipped.length) {
      console.log(
        `[migrations] Concluído. Aplicadas: ${result.applied.length}, ignoradas: ${result.skipped.length}.`
      );
    }
  } catch (err) {
    console.error("[migrations] Erro:", err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = runMigrations;
/** Testes e scripts auxiliares */
module.exports.MIGRATIONS = MIGRATIONS;
module.exports.__runner = { runPendingMigrations };

if (require.main === module) {
  require("dotenv").config();

  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      try {
        await pool.end();
      } catch {
        // ignore
      }
      process.exit(1);
    });
}
