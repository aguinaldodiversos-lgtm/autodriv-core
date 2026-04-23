const { runSqlMigration } = require("../runSqlMigration");

module.exports = {
  name: "022_lead_score",

  async up(client) {
    await runSqlMigration(client, "022_lead_score.sql");
  }
};
