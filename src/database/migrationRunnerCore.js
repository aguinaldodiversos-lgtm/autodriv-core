const {
  MIGRATIONS: defaultMigrations,
  computeChecksumForName: defaultComputeChecksum,
} = require("./migrationManifest");

function getComputeChecksum(options) {
  if (options && typeof options.computeChecksumForName === "function") {
    return options.computeChecksumForName;
  }
  return defaultComputeChecksum;
}

const CREATE_LEDGER_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  checksum TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INTEGER
);
`;

const CREATE_LEDGER_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations (name);
`;

/**
 * Cria tabela de ledger (idempotente). Não entra no fluxo de transação das migrations.
 */
async function ensureSchemaMigrationsTable(client) {
  await client.query(CREATE_LEDGER_SQL);
  await client.query(CREATE_LEDGER_INDEX_SQL);
}

async function fetchAppliedRows(client) {
  const { rows } = await client.query(
    `SELECT name, checksum, executed_at, execution_time_ms
     FROM schema_migrations
     ORDER BY id ASC`
  );
  return rows;
}

function appliedMapFromRows(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.name, row);
  }
  return map;
}

function isStrictChecksum() {
  if (process.env.MIGRATIONS_STRICT === "0" || process.env.MIGRATIONS_STRICT === "false") {
    return false;
  }
  return true;
}

/**
 * Aplica migrations pendentes; uma transação por migration.
 * @param {import("pg").PoolClient} client
 * @param {object} options
 * @param {Array} [options.migrations] default MIGRATIONS
 * @param {console} [options.log] default console
 * @returns {Promise<{ applied: string[], skipped: string[] }>}
 */
async function runPendingMigrations(client, options = {}) {
  const migrations = options.migrations || defaultMigrations;
  const log = options.log || console;
  const computeChecksumForName = getComputeChecksum(options);

  await ensureSchemaMigrationsTable(client);

  const existingRows = await fetchAppliedRows(client);
  const applied = appliedMapFromRows(existingRows);
  const appliedOut = [];
  const skipped = [];

  for (const migration of migrations) {
    if (!migration || typeof migration.up !== "function") {
      throw new Error(
        `[migrations] Migration inválida: ${migration?.name || "sem nome"}`
      );
    }

    const name = migration.name || "migration_sem_nome";

    if (applied.has(name)) {
      if (isStrictChecksum()) {
        const row = applied.get(name);
        const onDisk = computeChecksumForName(name);
        if (row.checksum && onDisk !== row.checksum) {
          throw new Error(
            `[migrations] Checksum incompatível para \"${name}\" (ficheiro alterado após aplicação). ` +
              `Não reescreva migrations antigas. Restaure o ficheiro ou alinhe o ledger. ` +
              `Para ambiente de desenvolvimento, use MIGRATIONS_STRICT=0 (não use em produção).`
          );
        }
      }
      log.log(`[migrations] Já aplicada, ignorar: ${name}`);
      skipped.push(name);
      continue;
    }

    const fileChecksum = computeChecksumForName(name);
    const start = Date.now();
    log.log(`[migrations] A executar: ${name}`);

    await client.query("BEGIN");
    try {
      await migration.up(client);
      const ms = Date.now() - start;
      await client.query(
        `INSERT INTO schema_migrations (name, checksum, execution_time_ms)
         VALUES ($1, $2, $3)`,
        [name, fileChecksum, ms]
      );
      await client.query("COMMIT");
      log.log(`[migrations] Concluída: ${name} (${ms} ms)`);
      appliedOut.push(name);
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (rbErr) {
        log.error("[migrations] Erro no ROLLBACK:", rbErr);
      }
      err.message = `[migrations] Falha em "${name}": ${err.message || err}`;
      throw err;
    }
  }

  if (appliedOut.length) {
    log.log(`[migrations] Aplicadas nesta execução: ${appliedOut.length}`);
  }
  if (skipped.length === migrations.length && !appliedOut.length) {
    log.log("[migrations] Nada pendente; base alinhada com o manifest.");
  }

  return { applied: appliedOut, skipped };
}

/**
 * Insere no ledger sem executar up() (baseline para bases já migradas com o runner antigo).
 * Não cria tabelas; pressupõe que o ficheiro de checksum corresponde ao estado do schema.
 * @param {import("pg").PoolClient} client
 * @param {object} [options]
 * @param {Array} [options.migrations]
 * @param {console} [options.log]
 * @returns {Promise<{ inserted: string[], skipped: string[] }>}
 */
async function insertBaselineWithoutRunning(client, options = {}) {
  const migrations = options.migrations || defaultMigrations;
  const log = options.log || console;
  const computeChecksumForName = getComputeChecksum(options);

  await ensureSchemaMigrationsTable(client);

  const existingRows = await fetchAppliedRows(client);
  const applied = appliedMapFromRows(existingRows);
  const inserted = [];
  const skipped = [];

  for (const migration of migrations) {
    const name = migration.name || "migration_sem_nome";
    if (applied.has(name)) {
      skipped.push(name);
      continue;
    }
    const fileChecksum = computeChecksumForName(name);
    const now = new Date();
    await client.query(
      `INSERT INTO schema_migrations (name, checksum, executed_at, execution_time_ms)
       VALUES ($1, $2, $3, $4)`,
      [name, fileChecksum, now, 0]
    );
    inserted.push(name);
    log.log(`[migrations:baseline] Registado: ${name}`);
  }

  return { inserted, skipped };
}

module.exports = {
  ensureSchemaMigrationsTable,
  fetchAppliedRows,
  appliedMapFromRows,
  runPendingMigrations,
  insertBaselineWithoutRunning,
  CREATE_LEDGER_SQL,
};
