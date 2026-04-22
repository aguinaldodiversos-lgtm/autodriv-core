require("dotenv").config();

const REQUIRED = ["JWT_SECRET", "DATABASE_URL"];

for (const key of REQUIRED) {
  if (!process.env[key] || String(process.env[key]).trim() === "") {
    console.error(
      `[env] Variável obrigatória ausente: ${key}. Abortando boot.`
    );
    process.exit(1);
  }
}

if (process.env.JWT_SECRET.length < 32) {
  console.error(
    "[env] JWT_SECRET deve ter ao menos 32 caracteres. Abortando boot."
  );
  process.exit(1);
}

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGINS: corsOrigins,
  NODE_ENV: process.env.NODE_ENV || "production"
};
