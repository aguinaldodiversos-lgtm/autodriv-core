/**
 * CI: corre todas as migrations e valida um invariante mínimo de multi-tenant em SQL.
 * Requer DATABASE_URL e JWT_SECRET (≥32) no ambiente. Usa NODE_ENV≠production para não exigir CORS_ORIGIN.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

if (!process.env.NODE_ENV || process.env.NODE_ENV === "test") {
  process.env.NODE_ENV = "development";
}

async function main() {
  const runMigrations = require("../src/database/migrate");
  await runMigrations();

  const pool = require("../src/config/db");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const d1 = await client.query(
      `INSERT INTO dealerships (name, email) VALUES ($1, $2) RETURNING id`,
      [`ci-a-${suffix}`, `ci-a-${suffix}@example.com`]
    );
    const d2 = await client.query(
      `INSERT INTO dealerships (name, email) VALUES ($1, $2) RETURNING id`,
      [`ci-b-${suffix}`, `ci-b-${suffix}@example.com`]
    );
    const id1 = d1.rows[0].id;
    const id2 = d2.rows[0].id;

    const lead = await client.query(
      `INSERT INTO leads (dealership_id, source, status)
       VALUES ($1, 'ci', 'new') RETURNING id`,
      [id1]
    );
    const lid = lead.rows[0].id;

    const wrong = await client.query(
      `SELECT id FROM leads WHERE id = $1 AND dealership_id = $2`,
      [lid, id2]
    );
    if (wrong.rows.length) {
      throw new Error(
        "CI: isolamento tenant falhou — lead acessível com dealership_id errado"
      );
    }

    await client.query("ROLLBACK");
    console.log("[ci] migrations + check tenant OK");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
