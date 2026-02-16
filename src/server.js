const app = require("./app");
const { PORT } = require("./config/env");
const initDB = require("./database/init");

async function start() {
  await initDB();

  app.listen(PORT, () => {
    console.log("Servidor rodando na porta", PORT);
  });
}

start();
