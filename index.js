require("dotenv").config();

const runMigrations = require("./src/database/migrate");
const app = require("./src/app");

const PORT = process.env.PORT || 3000;

async function start() {
  await runMigrations();

  app.listen(PORT, () => {
    console.log("Servidor rodando na porta", PORT);
  });
}

start();
