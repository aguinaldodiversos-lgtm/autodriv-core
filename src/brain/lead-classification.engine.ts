// src/brain/lead-classification.engine.ts

import { LocalAIService } from "@/infrastructure/ai/local-ai.service"

export class LeadClassificationEngine {
  constructor(private ai: LocalAIService) {}

  async scoreLead(message: string) {
    const sentiment = await this.ai.classify(message)

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
