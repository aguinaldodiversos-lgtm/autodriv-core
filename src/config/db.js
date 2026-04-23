const { Pool } = require("pg");
const { DATABASE_URL } = require("./env");

function useSslForUrl(connectionString) {
  if (process.env.DATABASE_SSL_DISABLE === "true") return false;
  if (/sslmode=disable/i.test(connectionString)) return false;
  if (process.env.DATABASE_SSL === "true") return true;
  try {
    const normalized = connectionString
      .replace(/^postgres:\/\//, "http://")
      .replace(/^postgresql:\/\//, "http://");
    const u = new URL(normalized);
    const host = (u.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return false;
    }
  } catch {
    // ignore parse errors; default to SSL below
  }
  return true;
}

const max = parseInt(process.env.PG_POOL_MAX || "20", 10);
const idleTimeoutMillis = parseInt(
  process.env.PG_POOL_IDLE_MS || "30000",
  10
);
const connectionTimeoutMillis = parseInt(
  process.env.PG_POOL_CONNECT_TIMEOUT_MS || "10000",
  10
);

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number.isFinite(max) && max > 0 ? max : 20,
  idleTimeoutMillis: Number.isFinite(idleTimeoutMillis) ? idleTimeoutMillis : 30000,
  connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis)
    ? connectionTimeoutMillis
    : 10000,
  ...(useSslForUrl(DATABASE_URL)
    ? { ssl: { rejectUnauthorized: false } }
    : {})
});

module.exports = pool;
