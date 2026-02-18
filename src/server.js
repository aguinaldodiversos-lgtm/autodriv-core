require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 10000;

/* =========================
   INICIAR SERVIDOR
========================= */
app.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log("=================================");
});

/* =========================
   TRATAMENTO DE ERROS GLOBAIS
========================= */
process.on("unhandledRejection", (err) => {
  console.error("Erro não tratado (Promise):", err);
});

process.on("uncaughtException", (err) => {
  console.error("Exceção não capturada:", err);
});
