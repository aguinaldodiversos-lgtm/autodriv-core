const OpenAI = require("openai")
const whatsapp = require("../modules/whatsapp/whatsapp.service")

class AISalesAgent {

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async respond(lead, vehicle) {

    const prompt = `
    Você é um vendedor de alta conversão.
    Lead: ${lead.message}
    Veículo: ${vehicle.model}
    Objetivo: trazer cliente para loja.
    `

    const response =
      await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })

    const message =
      response.choices[0].message.content

    await whatsapp.sendMessage(
      lead.phone,
      message
    )

    return message
  }
}

module.exports = AISalesAgent
