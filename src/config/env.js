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

const DATABASE_URL = requireEnv("DATABASE_URL");
const JWT_SECRET_RAW = requireEnv("JWT_SECRET");
if (JWT_SECRET_RAW.length < 32) {
  throw new Error(
    "[config] JWT_SECRET deve ter pelo menos 32 caracteres (sem fallback; use um segredo forte)."
  );
}

if (process.env.NODE_ENV === "production") {
  const co = process.env.CORS_ORIGIN;
  if (!co || !String(co).trim()) {
    throw new Error(
      "[config] Em produção defina CORS_ORIGIN com origens permitidas (lista separada por vírgulas). " +
        "API só com servidor-a-servidor: use um valor sentinela e não exponha o browser à API privada."
    );
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL,
  JWT_SECRET: JWT_SECRET_RAW
};
