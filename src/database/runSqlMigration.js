const fs = require("fs");
const path = require("path");

/**
 * Executa um ficheiro .sql em src/database/migrations/ (várias statements num único round-trip).
 */
async function runSqlMigration(client, sqlBasename) {
  const full = path.join(__dirname, "migrations", sqlBasename);
  const sql = fs.readFileSync(full, "utf8");
  await client.query(sql);
}

module.exports = { runSqlMigration };
