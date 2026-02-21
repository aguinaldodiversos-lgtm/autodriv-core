// src/infrastructure/ai/local-ai.service.ts

import { pipeline } from "@xenova/transformers"

export class LocalAIService {
  private classifier: any
  private embedder: any

  async init() {
    this.classifier = await pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    )

    this.embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    )
  }

  async classify(text: string) {
    if (!this.classifier) {
      throw new Error("Local AI not initialized")
    }

    return await this.classifier(text)
  }

  async embed(text: string) {
    if (!this.embedder) {
      throw new Error("Local AI not initialized")
    }

    const result = await this.embedder(text)
    return result[0]
  }
}
