const pool = require("../../config/db");
const repo = require("./ads.repository");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   PROMPT DE GERAÇÃO
========================= */
function buildPrompt(vehicle, platform) {
  return `
Você é um especialista em vendas de veículos.

Crie um anúncio profissional e persuasivo para a plataforma: ${platform}.

Dados do veículo:
Marca: ${vehicle.brand}
Modelo: ${vehicle.model}
Ano: ${vehicle.year}
Preço: ${vehicle.price}
Status: ${vehicle.status}
Documentação: ${vehicle.documentation_status}

Regras:
- Texto claro e objetivo
- Tom profissional e confiável
- Foco em conversão
- Evitar exageros
- Sem emojis para portais
- Com emojis apenas para redes sociais

Retorne no formato JSON:
{
  "title": "titulo",
  "description": "descricao"
}
`;
}

/* =========================
   GERAR ANÚNCIO COM IA
========================= */
async function generateAd(data, user) {
  const vehicleResult = await pool.query(
    `SELECT * FROM vehicles
     WHERE id = $1 AND dealership_id = $2`,
    [data.vehicle_id, user.dealershipId]
  );

  const vehicle = vehicleResult.rows[0];
  if (!vehicle) throw new Error("Veículo não encontrado");

  const prompt = buildPrompt(vehicle, data.platform);

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "Você cria anúncios automotivos." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7
  });

  let content = response.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Erro ao interpretar resposta da IA");
  }

  const ad = await repo.create({
    dealership_id: user.dealershipId,
    vehicle_id: vehicle.id,
    title: parsed.title,
    description: parsed.description,
    platform: data.platform
  });

  return ad;
}

async function listAds(vehicleId, user) {
  return repo.findByVehicle(vehicleId, user.dealershipId);
}

module.exports = {
  generateAd,
  listAds
};
