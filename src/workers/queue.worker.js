require("dotenv").config();

const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { QUEUE_NAME } = require("../infrastructure/jobs/default.queue");

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL é obrigatório para o worker de fila.");
  process.exit(1);
}

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.name === "ping") {
      return { ok: true, at: job.data?.at };
    }
    return { skipped: true, name: job.name };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[queue] job ${job.id} concluído (${job.name})`);
});

worker.on("failed", (job, err) => {
  console.error(`[queue] job ${job?.id} falhou`, err);
});

async function shutdown() {
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
