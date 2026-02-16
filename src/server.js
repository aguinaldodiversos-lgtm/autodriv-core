const app = require("./app");
const { PORT } = require("./config/env");
const runMigrations = require("./database/migrate");

async function start() {
  await runMigrations();

  app.listen(PORT, () => {
    console.log("Servidor rodando na porta", PORT);
  });
}

start();
