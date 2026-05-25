const assert = require("assert");
const crypto = require("crypto");
const { test, describe } = require("node:test");
const path = require("path");

/** Checksum fixo (64 hex) sem ficheiro em `migrations/` — unit tests de migrations sintéticas */
function testChecksumForName(name) {
  return crypto.createHash("sha256").update(`test:${name}`, "utf8").digest("hex");
}
const { ensureSchemaMigrationsTable, runPendingMigrations, insertBaselineWithoutRunning } = require(
  path.join("..", "src", "database", "migrationRunnerCore")
);
const { MIGRATIONS, computeChecksumForName } = require(
  path.join("..", "src", "database", "migrationManifest")
);

// Garante ordem estável do manifest (regressão)
describe("manifest de migrations", () => {
  test("ordem: primeiro 001, último 039", () => {
    assert.strictEqual(MIGRATIONS[0].name, "001_dealerships");
    assert.strictEqual(
      MIGRATIONS[MIGRATIONS.length - 1].name,
      "040_intelligence_action_outcomes"
    );
  });

  test("checksum: ficheiro 001_dealerships.js é legível e hash hex de 64 chars", () => {
    const h = computeChecksumForName("001_dealerships");
    assert.strictEqual(typeof h, "string");
    assert.strictEqual(h.length, 64);
  });
});

function createMockClient() {
  const ledger = new Map();
  return {
    ledger,
    calls: [],
    _inTx: false,
    async query(sql, params) {
      this.calls.push({ sql, params: params || [] });
      if (String(sql).includes("CREATE TABLE IF NOT EXISTS schema_migrations")) {
        return { rows: [] };
      }
      if (String(sql).includes("CREATE INDEX IF NOT EXISTS idx_schema_migrations_name")) {
        return { rows: [] };
      }
      if (sql === "BEGIN") {
        this._inTx = true;
        return { rows: [] };
      }
      if (sql === "COMMIT" || sql === "ROLLBACK") {
        this._inTx = false;
        return { rows: [] };
      }
      if (String(sql).includes("SELECT name, checksum, executed_at") && String(sql).includes("schema_migrations")) {
        return {
          rows: Array.from(ledger.values()),
        };
      }
      if (String(sql).trim().startsWith("INSERT INTO schema_migrations")) {
        const name = params[0];
        ledger.set(name, {
          name,
          checksum: params[1],
          execution_time_ms: params[2],
        });
        return { rows: [] };
      }
      if (String(sql) === "DO_FAIL") {
        const err = new Error("simulated SQL failure");
        err.code = "28P01";
        throw err;
      }
      return { rows: [] };
    },
  };
}

describe("runPendingMigrations (mock client)", () => {
  test("normaliza ledger antigo adicionando colunas novas antes de consultar", async () => {
    const c = createMockClient();
    await ensureSchemaMigrationsTable(c);
    assert.ok(
      c.calls.some((call) =>
        String(call.sql).includes("ALTER TABLE schema_migrations")
      )
    );
  });

  test("banco vazio: aplica todas e regista no ledger (2 migrations pequenas)", async () => {
    const c = createMockClient();
    const a = { name: "a_test_1", async up(client) { await client.query("SELECT 1"); } };
    const b = { name: "b_test_2", async up(client) { await client.query("SELECT 2"); } };
    const r = await runPendingMigrations(c, {
      migrations: [a, b],
      computeChecksumForName: testChecksumForName,
      log: { log: () => {} },
    });
    assert.deepStrictEqual(r.applied, ["a_test_1", "b_test_2"]);
    assert.strictEqual(c.ledger.size, 2);
    assert.ok(c.ledger.get("a_test_1")?.checksum);
  });

  test("segunda execução: zero aplicadas, todas passam a ignored no ledger (sem duplicar INSERT)", async () => {
    const c1 = createMockClient();
    const m1 = { name: "x_only", async up(client) { await client.query("SELECT 1"); } };
    await runPendingMigrations(c1, {
      migrations: [m1],
      computeChecksumForName: testChecksumForName,
      log: { log: () => {} },
    });
    const insertCount1 = c1.calls.filter((x) => String(x.sql).includes("INSERT INTO schema_migrations")).length;
    const r2 = await runPendingMigrations(c1, {
      migrations: [m1],
      computeChecksumForName: testChecksumForName,
      log: { log: () => {} },
    });
    const insertCount2 = c1.calls.filter((x) => String(x.sql).includes("INSERT INTO schema_migrations")).length;
    assert.strictEqual(insertCount1, 1);
    assert.strictEqual(insertCount2, 1);
    assert.strictEqual(r2.applied.length, 0);
    assert.strictEqual(r2.skipped.length, 1);
  });

  test("falha na migration: nada de ledger para a que falha; anterior persistida (COMMIT + ROLLBACK)", async () => {
    const c = createMockClient();
    const ok = { name: "ok_m", async up(cl) { await cl.query("SELECT 1"); } };
    const bad = {
      name: "bad_m",
      async up(cl) {
        await cl.query("DO_FAIL");
      },
    };
    let threw = false;
    try {
      await runPendingMigrations(c, {
        migrations: [ok, bad],
        computeChecksumForName: testChecksumForName,
        log: { log: () => {}, error: () => {} },
      });
    } catch (e) {
      threw = true;
      assert.match(String(e.message), /Falha em "bad_m":/);
    }
    assert.ok(threw);
    assert.ok(c.ledger.get("ok_m"));
    assert.ok(!c.ledger.get("bad_m"));
  });

  test("ordem de execução: up() m1 antes de m2", async () => {
    const c = createMockClient();
    const order = [];
    const m1 = {
      name: "order_1",
      async up() {
        order.push(1);
      },
    };
    const m2 = {
      name: "order_2",
      async up() {
        order.push(2);
      },
    };
    await runPendingMigrations(c, {
      migrations: [m1, m2],
      computeChecksumForName: testChecksumForName,
      log: { log: () => {} },
    });
    assert.deepStrictEqual(order, [1, 2]);
  });
});

describe("insertBaselineWithoutRunning (mock)", () => {
  test("insere no ledger sem chamar up", async () => {
    const c = createMockClient();
    const m = { name: "baseline_row", up: async () => assert.fail("não chamar up") };
    const r = await insertBaselineWithoutRunning(c, {
      migrations: [m],
      computeChecksumForName: testChecksumForName,
      log: { log: () => {} },
    });
    assert.ok(r.inserted.includes("baseline_row"));
  });
});

if (process.env.MIGRATION_TEST_URL) {
  test("integração Postgres: schema vazio, migrate duas vezes, ledger com linhas", { timeout: 120_000 }, async (t) => {
    const { Client } = require("pg");
    const url = process.env.MIGRATION_TEST_URL;
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      await client.query("DROP SCHEMA public CASCADE");
      await client.query("CREATE SCHEMA public");
      await client.query("GRANT ALL ON SCHEMA public TO public");
    } catch (e) {
      t.skip("DROP/CREATE public: " + e.message);
      try {
        await client.end();
      } catch {
        // ignore
      }
      return;
    }
    const { runPendingMigrations: run } = require(
      path.join("..", "src", "database", "migrationRunnerCore")
    );
    const { MIGRATIONS: full } = require(path.join("..", "src", "database", "migrationManifest"));
    const r1 = await run(client, { migrations: full, log: { log: () => {} } });
    const r2 = await run(client, { migrations: full, log: { log: () => {} } });
    assert.ok(r1.applied.length > 0, "primeira passagem aplica pendentes");
    assert.strictEqual(r2.applied.length, 0, "segunda passagem não reaplica");
    const { rows } = await client.query("SELECT name FROM schema_migrations ORDER BY id");
    assert.ok(rows.length >= 37, "ledger contém o manifest");
    await client.end();
  });
} else {
  test.skip("integração Postgres (MIGRATION_TEST_URL não definido)", () => {});
}
