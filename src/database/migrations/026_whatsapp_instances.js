const { runSqlMigration } = require("../runSqlMigration");

module.exports = {
  name: "026_whatsapp_instances",

  async up(client) {
    await runSqlMigration(client, "026_whatsapp_instances.sql");
  }
};
