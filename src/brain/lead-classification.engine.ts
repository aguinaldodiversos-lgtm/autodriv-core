// src/brain/lead-classification.engine.ts
// Instancia: mesma semantica que src/infrastructure/ai/localAI.service.js (unica fonte).

type LocalAIPort = typeof import("@/infrastructure/ai/localAI.service")

export class LeadClassificationEngine {
  constructor(private ai: LocalAIPort) {}

  async scoreLead(message: string) {
    const sentiment = await this.ai.classify(message, 8000)

    const score =
      sentiment[0].label === "POSITIVE"
        ? 0.8
        : 0.3

    return {
      intentScore: score,
      raw: sentiment
    }
  }
}
