const { Pool } = require("pg");
const { DATABASE_URL } = require("./env");
const logger = require("../infrastructure/logger/logger");

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: num(process.env.PG_POOL_MAX, 10),
  idleTimeoutMillis: num(process.env.PG_IDLE_TIMEOUT_MS, 30_000),
  connectionTimeoutMillis: num(process.env.PG_CONNECTION_TIMEOUT_MS, 5_000),
  statement_timeout: num(process.env.PG_STATEMENT_TIMEOUT_MS, 30_000),
  query_timeout: num(process.env.PG_QUERY_TIMEOUT_MS, 30_000)
});

pool.on("error", (err) => {
  logger.error({ err }, "postgres pool error");
});

module.exports = pool;
