const localAI = require("../../infrastructure/ai/localAI.service")

class LeadScoreService {
  async scoreLead(message) {
    try {
      const sentiment = await localAI.classify(message)

      const positivo =
        sentiment[0].label === "POSITIVE"

      const urgencia =
        message.includes("hoje") ||
        message.includes("agora")

      let score = 50

      if (positivo) score += 20
      if (urgencia) score += 20

      return Math.min(100, score)
    } catch (error) {
      return 50 // fallback neutro
    }
  }
}

module.exports = new LeadScoreService()
