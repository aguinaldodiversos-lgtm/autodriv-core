const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const QUEUE_NAME = "default";

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
      connection: createBullConnection()
    });
  }
  return queueInstance;
}

module.exports = { getDefaultQueue, QUEUE_NAME };
