require("dotenv").config();

const runMigrations = require("./database/migrate");
const app = require("./app");
const logger = require("./infrastructure/logger/logger");
const {
  startWhatsApp
} = require("./modules/whatsapp_baileys/whatsapp.baileys");

const PORT = Number(process.env.PORT) || 10000;

/**
 * Scheduler pragmático via setInterval. Só liga se ENABLE_WORKERS=true.
 * O seletor explícito evita a "feature fantasma" em que o produto prometia
 * follow-ups automáticos mas nada era disparado.
 */
function startWorkersIfEnabled() {
  if (process.env.ENABLE_WORKERS !== "true") {
    logger.info("workers disabled (ENABLE_WORKERS != 'true')");
    return;
  }

  const intervalMs = Number(process.env.FOLLOWUP_INTERVAL_MS) || 15 * 60 * 1000;
  const { runFollowUp } = require("./workers/followup.worker");

  logger.info({ intervalMs }, "followup worker enabled");

  const tick = async () => {
    try {
      await runFollowUp();
    } catch (err) {
      logger.error({ err }, "followup worker tick failed");
    }
  };

  // Primeiro disparo após boot + recorrência.
  setTimeout(tick, 30_000);
  setInterval(tick, intervalMs);
}

async function start() {
  try {
    logger.info("running migrations...");
    await runMigrations();
    logger.info("migrations done");

    app.listen(PORT, async () => {
      logger.info({ port: PORT }, "server listening");

      try {
        logger.info("starting whatsapp...");
        await startWhatsApp();
      } catch (err) {
        logger.error({ err }, "whatsapp startup failed");
      }

      startWorkersIfEnabled();
    });
  } catch (err) {
    logger.error({ err }, "server startup failed");
    process.exit(1);
  }
}

start();

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "unhandledRejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException");
});
