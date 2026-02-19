const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateStrategyReport(data) {

  const prompt = `
Você é um consultor especialista em performance comercial para lojas de veículos.

Analise os dados abaixo e forneça recomendações práticas e objetivas para melhorar conversão, vendas e visitas.

DADOS:
${JSON.stringify(data, null, 2)}

Responda em formato:
- Problema identificado
- Impacto
- Ação recomendada
- Prioridade (Alta, Média ou Baixa)
`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 400
  });

  return response.choices[0].message.content;
}

module.exports = {
  generateStrategyReport
};
