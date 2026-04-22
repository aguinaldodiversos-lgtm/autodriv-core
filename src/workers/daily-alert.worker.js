// DESATIVADO — depende de `brain/executive-report.engine` que é um arquivo
// TypeScript não compilado pelo projeto. Manter o require quebraria o boot.
// Quando essa engine for portada para JavaScript (ou o projeto adotar build
// de TS), reativar o scheduler em server.js.
//
// Formato preservado para não quebrar imports acidentais.
async function runDailyAlerts() {
  const logger = require("../infrastructure/logger/logger");
  logger.warn(
    "daily-alert.worker está desativado: executive-report.engine não é executável em runtime JS"
  );
}

module.exports = runDailyAlerts;
module.exports.runDailyAlerts = runDailyAlerts;
module.exports.DISABLED = true;
