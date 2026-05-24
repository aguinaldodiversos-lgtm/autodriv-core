#!/usr/bin/env node
/**
 * Lista o prefixo e o módulo de rota definidos em src/app.js (API Express "npm start").
 * Nao carrega a aplicacao (sem dotenv/DB) — leitura e parse de texto.
 */
const fs = require("fs");
const path = require("path");

const appJs = path.join(__dirname, "../src/app.js");
const s = fs.readFileSync(appJs, "utf8");

console.log("Entrada: npm start -> node src/server.js -> require('./app.js')\n");
console.log("Rotas (prefixo   ->  require relativo a src/):\n");

const mountRe = /\[['"](\/api\/[^'"]+)['"]\s*,\s*require\(['"](\.\/[^'"]+)['"]\)\]/g;
let m;
const seen = new Set();
while ((m = mountRe.exec(s)) !== null) {
  if (seen.has(m[1])) continue;
  seen.add(m[1]);
  const mod = m[2].replace(/^\.\//, "src/");
  console.log(`  ${m[1]}\n    -> ${mod}`);
}

if (/app\.use\(['"]\/api\/auth['"]/.test(s)) {
  console.log("  /api/auth\n    -> (auth routes) src/modules/auth/auth.routes");
}
if (/app\.use\(\s*["']\/api\/dev["']/.test(s)) {
  console.log(
    "  /api/dev\n    -> (condicional) ENABLE_DEV_ROUTES + X-Dev-Routes-Secret; dev.routes — docs/OPERATIONS.md"
  );
}

console.log(
  "\nMais detalhe: docs/ENTRYPOINTS.md  |  GET /api (com app a correr) devolve a lista de mounts em JSON."
);
