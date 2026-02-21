// src/brain/lead-intent.engine.ts

export class LeadIntentEngine {
  constructor(private ai: any) {}

  async detectIntent(text: string) {
    const embedding = await this.ai.embed(text)

    const urgency =
      text.includes("hoje") ||
      text.includes("agora") ||
      text.includes("urgente")

    const tradeIn =
      text.includes("troca") ||
      text.includes("dar meu carro")

    return {
      urgency,
      tradeIn,
      embedding
    }
  }
}
