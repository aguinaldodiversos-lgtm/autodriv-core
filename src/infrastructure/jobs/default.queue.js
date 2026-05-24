/**
 * Fila genérica "default" (BullMQ + ioredis).
 * Usada de forma mínima por `dev.routes` (job `ping` de teste) e `queue.worker`
 * processa o mesmo `QUEUE_NAME`. Comportamento além de `ping` + skip é experimental.
 * Ver docs/OPERATIONS.md.
 */
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const QUEUE_NAME = "default";

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 }
};

function createBullConnection() {
  return new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

let queueInstance = null;

function getDefaultQueue() {
  if (!process.env.REDIS_URL) return null;
  if (!queueInstance) {
    queueInstance = new Queue(QUEUE_NAME, {
      connection: createBullConnection(),
      defaultJobOptions
    });
  }
  return queueInstance;
}

module.exports = { getDefaultQueue, QUEUE_NAME, defaultJobOptions };
