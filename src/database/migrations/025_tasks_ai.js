const { runSqlMigration } = require("../runSqlMigration");

module.exports = {
  name: "025_tasks_ai",

  async up(client) {
    await runSqlMigration(client, "025_tasks_ai.sql");
  }
};
