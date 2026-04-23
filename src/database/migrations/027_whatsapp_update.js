const { runSqlMigration } = require("../runSqlMigration");

module.exports = {
  name: "027_whatsapp_update",

  async up(client) {
    await runSqlMigration(client, "027_whatsapp_update.sql");
  }
};
