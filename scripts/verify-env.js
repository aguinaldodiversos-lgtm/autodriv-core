/**
 * Falha o processo se env obrigatório for inválido (igual ao arranque da API).
 * Uso em pipeline antes do deploy: node scripts/verify-env.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
require("../src/config/env");
console.log("[verify-env] config OK");
