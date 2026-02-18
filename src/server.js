const app = require("./app");
const { runFollowUp } = require("./workers/followup.worker");

const PORT = process.env.PORT || 10000;

/* =========================
   INICIA SERVIDOR
========================= */
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

/* =========================
   FOLLOW-UP AUTOMÁTICO
   roda a cada 30 minutos
========================= */
setInterval(() => {
  runFollowUp()
    .then(() => {
      console.log("Follow-up executado com sucesso");
    })
    .catch((err) => {
      console.error("Erro no follow-up:", err);
    });
}, 1000 * 60 * 30);
