const repo = require("./tasks.repository");

async function listTasks(user) {
  return repo.findByDealership(user.dealership_id);
}

async function complete(taskId, user) {
  return repo.completeTask(taskId, user.dealership_id);
}

module.exports = {
  listTasks,
  complete
};
