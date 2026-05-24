require("dotenv").config();

const localAI = require("../infrastructure/ai/localAI.service");

async function main() {
  await localAI.init();
  console.log("[local-ai] Modelos carregados com sucesso");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[local-ai] Falha ao carregar modelos:", err);
    process.exit(1);
  });
