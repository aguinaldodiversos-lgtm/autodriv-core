require("dotenv").config();

const app = require("./app");
const PORT = process.env.PORT || 10000;

async function start() {
  try {
    app.listen(PORT, () => {
      console.log("=================================");
      console.log(`Servidor HTTP rodando na porta ${PORT}`);
      console.log("=================================");
    });
  } catch (err) {
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  }
}

start();

process.on("unhandledRejection", (err) => {
  console.error("Erro nao tratado (Promise):", err);
});

process.on("uncaughtException", (err) => {
  console.error("Excecao nao capturada:", err);
});
