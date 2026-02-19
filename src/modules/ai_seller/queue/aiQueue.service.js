const PQueue = require("p-queue").default;

const queue = new PQueue({
  concurrency: 3,
  interval: 1000,
  intervalCap: 5
});

async function addToQueue(task) {
  return queue.add(task);
}

module.exports = {
  addToQueue
};
