const { runSqlMigration } = require("../runSqlMigration");

module.exports = {
  name: "021_lead_profile_fields",

  async up(client) {
    await runSqlMigration(client, "021_lead_profile_fields.sql");
  }
};
