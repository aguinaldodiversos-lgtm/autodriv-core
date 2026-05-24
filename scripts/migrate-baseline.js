/**
 * Marca no ledger todas as migrations do manifest **sem** executar `up()`.
 * Use apenas se o banco **já** reflete o schema completo (p.ex. após o runner antigo
 * sem tabela de controlo) e quiser evitar reexecutar 001–037.
 *
 * Risco: se o schema real não coincidir com o manifest, o deploy seguinte
 * deixará de corrigir tabelas em falta. Ver docs/MIGRATIONS.md
 */
require("dotenv").config();

const pool = require("../src/config/db");
const { MIGRATIONS } = require("../src/database/migrationManifest");
const { insertBaselineWithoutRunning } = require("../src/database/migrationRunnerCore");

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { inserted, skipped } = await insertBaselineWithoutRunning(client, {
      migrations: MIGRATIONS,
      log: console,
    });
    await client.query("COMMIT");
    console.log(
      `[migrate-baseline] Concluído. Novos no ledger: ${inserted.length}, já existentes: ${skipped.length}.`
    );
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (e) {
      /* ignore */
    }
    console.error("[migrate-baseline] Erro:", err);
    process.exitCode = 1;
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => {
  process.exit(1);
});
