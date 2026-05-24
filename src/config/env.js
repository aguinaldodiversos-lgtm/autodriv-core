require("dotenv").config();

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === "") {
    throw new Error(
      `[config] Variável de ambiente obrigatória ausente ou vazia: ${name}`
    );
  }
  return String(v).trim();
}

const CORS_PRIVATE_SENTINELS = new Set([
  "server-to-server",
  "private",
  "none",
  "disabled",
  "false"
]);

function parseCorsOrigins(raw = process.env.CORS_ORIGIN) {
  if (!raw || !String(raw).trim()) return null;

  const value = String(raw).trim();
  if (CORS_PRIVATE_SENTINELS.has(value.toLowerCase())) return null;

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const DATABASE_URL = requireEnv("DATABASE_URL");
const JWT_SECRET_RAW = requireEnv("JWT_SECRET");
if (JWT_SECRET_RAW.length < 32) {
  throw new Error(
    "[config] JWT_SECRET deve ter pelo menos 32 caracteres (sem fallback; use um segredo forte)."
  );
}

module.exports = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL,
  JWT_SECRET: JWT_SECRET_RAW,
  REDIS_URL: process.env.REDIS_URL ? String(process.env.REDIS_URL).trim() : null,
  parseCorsOrigins
};
