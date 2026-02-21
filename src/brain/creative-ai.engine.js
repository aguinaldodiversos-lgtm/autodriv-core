const localAI = require("../infrastructure/ai/localAI.service")
const OpenAI = require("openai")

class CreativeAIEngine {

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async generate(vehicle) {

    const prompt = `
    Crie um anúncio persuasivo para:
    ${vehicle.model}
    Ano: ${vehicle.year}
    Preço: ${vehicle.price}
    Destaques: ${vehicle.features}
    Objetivo: gerar lead para loja.
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })

      return response.choices[0].message.content

    } catch {
      return `Oferta imperdível: ${vehicle.model} ${vehicle.year} por ${vehicle.price}. Venha conferir na loja!`
    }
  }
}

module.exports = CreativeAIEngine
